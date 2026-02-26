/**
 * Core types for auditctl - the audit logging system
 */

/**
 * Compliance-related metadata for audit entries
 */
export interface ComplianceInfo {
  /** Applicable regulations (e.g., "ECOA", "TRID", "HMDA") */
  regulations: string[];
  /** Risk flags identified during the operation */
  riskFlags: string[];
  /** Whether human review is required */
  humanReviewRequired: boolean;
  /** Specific compliance checks performed */
  checksPerformed?: string[];
  /** Any exemptions applied */
  exemptions?: string[];
}

/**
 * A single audit entry - the core unit of audit logging
 */
export interface AuditEntry {
  /** Unique identifier for this audit entry */
  auditId: string;
  /** ISO-8601 timestamp of when the entry was created */
  timestamp: string;
  /** The tool that generated this entry (e.g., "finctl", "mortctl") */
  tool: string;
  /** The specific command or operation performed */
  command: string;
  /** Version of the tool */
  toolVersion: string;
  /** Input parameters (sanitized - no PII in logs) */
  inputs: Record<string, unknown>;
  /** Output results */
  outputs: Record<string, unknown>;
  /** Human-readable explanation of the decision/calculation */
  rationale: string;
  /** Any warnings generated */
  warnings: string[];
  /** Compliance information */
  compliance: ComplianceInfo;
  /** Who or what initiated the operation */
  operator: string;
  /** Session or batch identifier for grouping related entries */
  sessionId?: string;
  /** Parent audit ID for chained operations */
  parentAuditId?: string;
  /** Loan or application identifier */
  loanId?: string;
  /** Duration of the operation in milliseconds */
  durationMs?: number;
  /** SHA-256 hash of the previous entry (for integrity chain) */
  previousHash?: string;
  /** SHA-256 hash of this entry */
  entryHash?: string;
}

/**
 * Options for creating an audit entry
 */
export interface AuditEntryOptions {
  tool: string;
  command: string;
  toolVersion: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  rationale: string;
  warnings?: string[];
  compliance?: Partial<ComplianceInfo>;
  operator?: string;
  sessionId?: string;
  parentAuditId?: string;
  loanId?: string;
  durationMs?: number;
}

/**
 * Query options for searching audit entries
 */
export interface AuditQueryOptions {
  /** Filter by loan ID */
  loanId?: string;
  /** Filter by tool name */
  tool?: string;
  /** Filter by command */
  command?: string;
  /** Filter by operator */
  operator?: string;
  /** Filter by session ID */
  sessionId?: string;
  /** Start of date range (ISO-8601) */
  startDate?: string;
  /** End of date range (ISO-8601) */
  endDate?: string;
  /** Filter entries with risk flags */
  hasRiskFlags?: boolean;
  /** Filter entries requiring human review */
  humanReviewRequired?: boolean;
  /** Maximum number of entries to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Storage backend interface - implement for different storage types
 */
export interface AuditStorage {
  /** Append an entry to the audit log */
  append(entry: AuditEntry): Promise<void>;
  /** Query entries based on options */
  query(options: AuditQueryOptions): Promise<AuditEntry[]>;
  /** Get entry by audit ID */
  getById(auditId: string): Promise<AuditEntry | null>;
  /** Get the last entry (for hash chaining) */
  getLastEntry(): Promise<AuditEntry | null>;
  /** Verify integrity of the audit chain */
  verifyIntegrity(fromDate?: string): Promise<IntegrityResult>;
  /** Count total entries */
  count(options?: AuditQueryOptions): Promise<number>;
}

/**
 * Result of an integrity verification
 */
export interface IntegrityResult {
  /** Overall verification status */
  valid: boolean;
  /** Total entries checked */
  entriesChecked: number;
  /** Number of valid entries */
  validEntries: number;
  /** Number of invalid entries */
  invalidEntries: number;
  /** Details of any integrity failures */
  failures: IntegrityFailure[];
}

/**
 * Details of an integrity failure
 */
export interface IntegrityFailure {
  auditId: string;
  timestamp: string;
  reason: string;
  expectedHash?: string;
  actualHash?: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'jsonl' | 'csv' | 'occ' | 'cfpb' | 'hmda';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  startDate?: string;
  endDate?: string;
  loanId?: string;
  tool?: string;
  includeInputs?: boolean;
  includeOutputs?: boolean;
  outputPath?: string;
}
