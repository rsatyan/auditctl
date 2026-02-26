"use strict";
/**
 * Core audit logger - creates and manages audit entries
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
exports.AuditLogger = void 0;
exports.computeEntryHash = computeEntryHash;
exports.sanitizeInputs = sanitizeInputs;
const uuid_1 = require("uuid");
const crypto = __importStar(require("crypto"));
/**
 * Default compliance info for entries without explicit compliance data
 */
const defaultComplianceInfo = {
    regulations: [],
    riskFlags: [],
    humanReviewRequired: false,
};
/**
 * Compute SHA-256 hash of an audit entry
 */
function computeEntryHash(entry) {
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
function sanitizeInputs(inputs) {
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
    const sanitized = {};
    for (const [key, value] of Object.entries(inputs)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeInputs(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
/**
 * AuditLogger - the main class for creating audit entries
 */
class AuditLogger {
    storage;
    defaultOperator;
    sessionId;
    constructor(storage, options) {
        this.storage = storage;
        this.defaultOperator = options?.defaultOperator || 'system';
        this.sessionId = options?.sessionId;
    }
    /**
     * Create and log a new audit entry
     */
    async log(options) {
        // Get the last entry for hash chaining
        const lastEntry = await this.storage.getLastEntry();
        const previousHash = lastEntry?.entryHash;
        // Build the entry (without final hash)
        const entryWithoutHash = {
            auditId: (0, uuid_1.v4)(),
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
        const entry = {
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
    async logDecision(options) {
        const outputs = {
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
                humanReviewRequired: options.decision === 'declined' ||
                    options.compliance?.humanReviewRequired ||
                    false,
            },
        });
    }
    /**
     * Start a new session and return a logger bound to that session
     */
    startSession(sessionId) {
        return new AuditLogger(this.storage, {
            defaultOperator: this.defaultOperator,
            sessionId: sessionId || (0, uuid_1.v4)(),
        });
    }
    /**
     * Get current session ID
     */
    getSessionId() {
        return this.sessionId;
    }
    /**
     * Query audit entries
     */
    async query(options) {
        return this.storage.query(options);
    }
    /**
     * Get entry by ID
     */
    async getById(auditId) {
        return this.storage.getById(auditId);
    }
    /**
     * Verify integrity of the audit chain
     */
    async verifyIntegrity(fromDate) {
        return this.storage.verifyIntegrity(fromDate);
    }
    /**
     * Count entries
     */
    async count(options) {
        return this.storage.count(options);
    }
}
exports.AuditLogger = AuditLogger;
//# sourceMappingURL=logger.js.map