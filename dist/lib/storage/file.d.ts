/**
 * File-based storage backend for audit entries
 * Uses append-only JSONL format for immutability
 */
import { AuditEntry, AuditStorage, AuditQueryOptions, IntegrityResult } from '../../types';
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
export declare class FileStorage implements AuditStorage {
    private filePath;
    constructor(options: FileStorageOptions);
    /**
     * Append an entry to the audit log
     */
    append(entry: AuditEntry): Promise<void>;
    /**
     * Query entries based on options
     */
    query(options: AuditQueryOptions): Promise<AuditEntry[]>;
    /**
     * Get entry by audit ID
     */
    getById(auditId: string): Promise<AuditEntry | null>;
    /**
     * Get the last entry (for hash chaining)
     */
    getLastEntry(): Promise<AuditEntry | null>;
    /**
     * Verify integrity of the audit chain
     */
    verifyIntegrity(fromDate?: string): Promise<IntegrityResult>;
    /**
     * Count total entries
     */
    count(options?: AuditQueryOptions): Promise<number>;
    /**
     * Read all entries from the file
     */
    private readAllEntries;
}
//# sourceMappingURL=file.d.ts.map