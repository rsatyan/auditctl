/**
 * Core audit logger - creates and manages audit entries
 */
import { AuditEntry, AuditEntryOptions, AuditStorage } from '../types';
/**
 * Compute SHA-256 hash of an audit entry
 */
export declare function computeEntryHash(entry: Omit<AuditEntry, 'entryHash'>): string;
/**
 * Sanitize inputs to remove PII before logging
 * Override this function for custom sanitization rules
 */
export declare function sanitizeInputs(inputs: Record<string, unknown>): Record<string, unknown>;
/**
 * AuditLogger - the main class for creating audit entries
 */
export declare class AuditLogger {
    private storage;
    private defaultOperator;
    private sessionId?;
    constructor(storage: AuditStorage, options?: {
        defaultOperator?: string;
        sessionId?: string;
    });
    /**
     * Create and log a new audit entry
     */
    log(options: AuditEntryOptions): Promise<AuditEntry>;
    /**
     * Log a decision with automatic adverse action support
     */
    logDecision(options: AuditEntryOptions & {
        decision: 'approved' | 'declined' | 'referred' | 'countered';
        declineReasons?: string[];
    }): Promise<AuditEntry>;
    /**
     * Start a new session and return a logger bound to that session
     */
    startSession(sessionId?: string): AuditLogger;
    /**
     * Get current session ID
     */
    getSessionId(): string | undefined;
    /**
     * Query audit entries
     */
    query(options: Parameters<AuditStorage['query']>[0]): Promise<AuditEntry[]>;
    /**
     * Get entry by ID
     */
    getById(auditId: string): Promise<AuditEntry | null>;
    /**
     * Verify integrity of the audit chain
     */
    verifyIntegrity(fromDate?: string): Promise<import("../types").IntegrityResult>;
    /**
     * Count entries
     */
    count(options?: Parameters<AuditStorage['count']>[0]): Promise<number>;
}
//# sourceMappingURL=logger.d.ts.map