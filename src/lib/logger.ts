/**
 * Core audit logger - creates and manages audit entries
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  AuditEntry,
  AuditEntryOptions,
  ComplianceInfo,
  AuditStorage,
} from '../types';

/**
 * Default compliance info for entries without explicit compliance data
 */
const defaultComplianceInfo: ComplianceInfo = {
  regulations: [],
  riskFlags: [],
  humanReviewRequired: false,
};

/**
 * Compute SHA-256 hash of an audit entry
 */
export function computeEntryHash(entry: Omit<AuditEntry, 'entryHash'>): string {
  const content = JSON.stringify({
    auditId: entry.auditId,
    timestamp: entry.timestamp,
    tool: entry.tool,
    command: entry.command,
    toolVersion: entry.toolVersion,
    inputs: entry.inputs,
    outputs: entry.outputs,
    rationale: entry.rationale,
    warnings: entry.warnings,
    compliance: entry.compliance,
    operator: entry.operator,
    sessionId: entry.sessionId,
    parentAuditId: entry.parentAuditId,
    loanId: entry.loanId,
    durationMs: entry.durationMs,
    previousHash: entry.previousHash,
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Sanitize inputs to remove PII before logging
 * Override this function for custom sanitization rules
 */
export function sanitizeInputs(
  inputs: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveKeys = [
    'ssn',
    'social_security',
    'socialSecurity',
    'ssn_last4',
    'password',
    'secret',
    'token',
    'api_key',
    'apiKey',
    'account_number',
    'accountNumber',
    'routing_number',
    'routingNumber',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInputs(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * AuditLogger - the main class for creating audit entries
 */
export class AuditLogger {
  private storage: AuditStorage;
  private defaultOperator: string;
  private sessionId?: string;

  constructor(
    storage: AuditStorage,
    options?: { defaultOperator?: string; sessionId?: string }
  ) {
    this.storage = storage;
    this.defaultOperator = options?.defaultOperator || 'system';
    this.sessionId = options?.sessionId;
  }

  /**
   * Create and log a new audit entry
   */
  async log(options: AuditEntryOptions): Promise<AuditEntry> {
    // Get the last entry for hash chaining
    const lastEntry = await this.storage.getLastEntry();
    const previousHash = lastEntry?.entryHash;

    // Build the entry (without final hash)
    const entryWithoutHash: Omit<AuditEntry, 'entryHash'> = {
      auditId: uuidv4(),
      timestamp: new Date().toISOString(),
      tool: options.tool,
      command: options.command,
      toolVersion: options.toolVersion,
      inputs: sanitizeInputs(options.inputs),
      outputs: options.outputs,
      rationale: options.rationale,
      warnings: options.warnings || [],
      compliance: {
        ...defaultComplianceInfo,
        ...options.compliance,
      },
      operator: options.operator || this.defaultOperator,
      sessionId: options.sessionId || this.sessionId,
      parentAuditId: options.parentAuditId,
      loanId: options.loanId,
      durationMs: options.durationMs,
      previousHash,
    };

    // Compute the entry hash
    const entryHash = computeEntryHash(entryWithoutHash);

    // Create the final entry
    const entry: AuditEntry = {
      ...entryWithoutHash,
      entryHash,
    };

    // Append to storage
    await this.storage.append(entry);

    return entry;
  }

  /**
   * Log a decision with automatic adverse action support
   */
  async logDecision(
    options: AuditEntryOptions & {
      decision: 'approved' | 'declined' | 'referred' | 'countered';
      declineReasons?: string[];
    }
  ): Promise<AuditEntry> {
    const outputs: Record<string, unknown> = {
      ...options.outputs,
      decision: options.decision,
    };

    // For declines, ensure we have adverse action reasons
    if (options.decision === 'declined') {
      outputs.adverseActionReasons = options.declineReasons || [
        'Unspecified reason',
      ];
    }

    return this.log({
      ...options,
      outputs,
      compliance: {
        ...options.compliance,
        regulations: [
          ...(options.compliance?.regulations || []),
          'ECOA',
          'Reg B',
        ],
        humanReviewRequired:
          options.decision === 'declined' ||
          options.compliance?.humanReviewRequired ||
          false,
      },
    });
  }

  /**
   * Start a new session and return a logger bound to that session
   */
  startSession(sessionId?: string): AuditLogger {
    return new AuditLogger(this.storage, {
      defaultOperator: this.defaultOperator,
      sessionId: sessionId || uuidv4(),
    });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Query audit entries
   */
  async query(options: Parameters<AuditStorage['query']>[0]) {
    return this.storage.query(options);
  }

  /**
   * Get entry by ID
   */
  async getById(auditId: string) {
    return this.storage.getById(auditId);
  }

  /**
   * Verify integrity of the audit chain
   */
  async verifyIntegrity(fromDate?: string) {
    return this.storage.verifyIntegrity(fromDate);
  }

  /**
   * Count entries
   */
  async count(options?: Parameters<AuditStorage['count']>[0]) {
    return this.storage.count(options);
  }
}
