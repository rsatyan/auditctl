/**
 * File-based storage backend for audit entries
 * Uses append-only JSONL format for immutability
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  AuditEntry,
  AuditStorage,
  AuditQueryOptions,
  IntegrityResult,
  IntegrityFailure,
} from '../../types';
import { computeEntryHash } from '../logger';

/**
 * File storage options
 */
export interface FileStorageOptions {
  /** Path to the audit log file */
  filePath: string;
  /** Create file if it doesn't exist */
  createIfMissing?: boolean;
}

/**
 * FileStorage - append-only JSONL file storage
 */
export class FileStorage implements AuditStorage {
  private filePath: string;

  constructor(options: FileStorageOptions) {
    this.filePath = path.resolve(options.filePath);

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create file if missing and option is set
    if (options.createIfMissing !== false && !fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '');
    }
  }

  /**
   * Append an entry to the audit log
   */
  async append(entry: AuditEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    await fs.promises.appendFile(this.filePath, line, 'utf-8');
  }

  /**
   * Query entries based on options
   */
  async query(options: AuditQueryOptions): Promise<AuditEntry[]> {
    const entries = await this.readAllEntries();
    let filtered = entries;

    // Apply filters
    if (options.loanId) {
      filtered = filtered.filter((e) => e.loanId === options.loanId);
    }
    if (options.tool) {
      filtered = filtered.filter((e) => e.tool === options.tool);
    }
    if (options.command) {
      filtered = filtered.filter((e) => e.command === options.command);
    }
    if (options.operator) {
      filtered = filtered.filter((e) => e.operator === options.operator);
    }
    if (options.sessionId) {
      filtered = filtered.filter((e) => e.sessionId === options.sessionId);
    }
    if (options.startDate) {
      const start = new Date(options.startDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= start);
    }
    if (options.endDate) {
      const end = new Date(options.endDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= end);
    }
    if (options.hasRiskFlags) {
      filtered = filtered.filter(
        (e) => e.compliance.riskFlags && e.compliance.riskFlags.length > 0
      );
    }
    if (options.humanReviewRequired !== undefined) {
      filtered = filtered.filter(
        (e) => e.compliance.humanReviewRequired === options.humanReviewRequired
      );
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || filtered.length;
    filtered = filtered.slice(offset, offset + limit);

    return filtered;
  }

  /**
   * Get entry by audit ID
   */
  async getById(auditId: string): Promise<AuditEntry | null> {
    const entries = await this.readAllEntries();
    return entries.find((e) => e.auditId === auditId) || null;
  }

  /**
   * Get the last entry (for hash chaining)
   */
  async getLastEntry(): Promise<AuditEntry | null> {
    const entries = await this.readAllEntries();
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }

  /**
   * Verify integrity of the audit chain
   */
  async verifyIntegrity(fromDate?: string): Promise<IntegrityResult> {
    const entries = await this.readAllEntries();
    const failures: IntegrityFailure[] = [];
    let validEntries = 0;

    // Filter by date if specified
    let toCheck = entries;
    if (fromDate) {
      const fromTime = new Date(fromDate).getTime();
      toCheck = entries.filter(
        (e) => new Date(e.timestamp).getTime() >= fromTime
      );
    }

    for (let i = 0; i < toCheck.length; i++) {
      const entry = toCheck[i];
      const entryIndex = entries.indexOf(entry);

      // Check hash chain
      if (entryIndex > 0) {
        const previousEntry = entries[entryIndex - 1];
        if (entry.previousHash !== previousEntry.entryHash) {
          failures.push({
            auditId: entry.auditId,
            timestamp: entry.timestamp,
            reason: 'Previous hash mismatch',
            expectedHash: previousEntry.entryHash,
            actualHash: entry.previousHash,
          });
          continue;
        }
      }

      // Verify entry hash
      const { entryHash, ...entryWithoutHash } = entry;
      const computedHash = computeEntryHash(entryWithoutHash as any);
      if (computedHash !== entryHash) {
        failures.push({
          auditId: entry.auditId,
          timestamp: entry.timestamp,
          reason: 'Entry hash mismatch - possible tampering',
          expectedHash: entryHash,
          actualHash: computedHash,
        });
        continue;
      }

      validEntries++;
    }

    return {
      valid: failures.length === 0,
      entriesChecked: toCheck.length,
      validEntries,
      invalidEntries: failures.length,
      failures,
    };
  }

  /**
   * Count total entries
   */
  async count(options?: AuditQueryOptions): Promise<number> {
    if (options) {
      const entries = await this.query(options);
      return entries.length;
    }
    const entries = await this.readAllEntries();
    return entries.length;
  }

  /**
   * Read all entries from the file
   */
  private async readAllEntries(): Promise<AuditEntry[]> {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    const entries: AuditEntry[] = [];
    const fileStream = fs.createReadStream(this.filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          entries.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid lines
          console.error(`Warning: Invalid JSON line in audit log: ${line}`);
        }
      }
    }

    return entries;
  }
}
