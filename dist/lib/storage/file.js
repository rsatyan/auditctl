"use strict";
/**
 * File-based storage backend for audit entries
 * Uses append-only JSONL format for immutability
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const logger_1 = require("../logger");
/**
 * FileStorage - append-only JSONL file storage
 */
class FileStorage {
    filePath;
    constructor(options) {
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
    async append(entry) {
        const line = JSON.stringify(entry) + '\n';
        await fs.promises.appendFile(this.filePath, line, 'utf-8');
    }
    /**
     * Query entries based on options
     */
    async query(options) {
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
            filtered = filtered.filter((e) => e.compliance.riskFlags && e.compliance.riskFlags.length > 0);
        }
        if (options.humanReviewRequired !== undefined) {
            filtered = filtered.filter((e) => e.compliance.humanReviewRequired === options.humanReviewRequired);
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
    async getById(auditId) {
        const entries = await this.readAllEntries();
        return entries.find((e) => e.auditId === auditId) || null;
    }
    /**
     * Get the last entry (for hash chaining)
     */
    async getLastEntry() {
        const entries = await this.readAllEntries();
        return entries.length > 0 ? entries[entries.length - 1] : null;
    }
    /**
     * Verify integrity of the audit chain
     */
    async verifyIntegrity(fromDate) {
        const entries = await this.readAllEntries();
        const failures = [];
        let validEntries = 0;
        // Filter by date if specified
        let toCheck = entries;
        if (fromDate) {
            const fromTime = new Date(fromDate).getTime();
            toCheck = entries.filter((e) => new Date(e.timestamp).getTime() >= fromTime);
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
            const computedHash = (0, logger_1.computeEntryHash)(entryWithoutHash);
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
    async count(options) {
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
    async readAllEntries() {
        if (!fs.existsSync(this.filePath)) {
            return [];
        }
        const entries = [];
        const fileStream = fs.createReadStream(this.filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });
        for await (const line of rl) {
            if (line.trim()) {
                try {
                    entries.push(JSON.parse(line));
                }
                catch (e) {
                    // Skip invalid lines
                    console.error(`Warning: Invalid JSON line in audit log: ${line}`);
                }
            }
        }
        return entries;
    }
}
exports.FileStorage = FileStorage;
//# sourceMappingURL=file.js.map