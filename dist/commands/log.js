"use strict";
/**
 * auditctl log command - Add entries to the audit log
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
exports.createLogCommand = createLogCommand;
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const logger_1 = require("../lib/logger");
const file_1 = require("../lib/storage/file");
function createLogCommand() {
    const log = new commander_1.Command('log')
        .description('Log an audit entry')
        .requiredOption('-t, --tool <name>', 'Tool name (e.g., finctl, mortctl)')
        .requiredOption('-c, --command <cmd>', 'Command executed')
        .requiredOption('--tool-version <ver>', 'Tool version')
        .option('-i, --inputs <json>', 'Input parameters as JSON')
        .option('-o, --outputs <json>', 'Output results as JSON')
        .option('-r, --rationale <text>', 'Human-readable rationale', '')
        .option('-w, --warnings <items>', 'Comma-separated warnings')
        .option('--regulations <items>', 'Comma-separated regulation codes')
        .option('--risk-flags <items>', 'Comma-separated risk flags')
        .option('--human-review', 'Requires human review', false)
        .option('--operator <name>', 'Operator identifier')
        .option('--session-id <id>', 'Session identifier')
        .option('--loan-id <id>', 'Loan/application identifier')
        .option('--parent-id <id>', 'Parent audit ID for chained operations')
        .option('--duration <ms>', 'Operation duration in milliseconds')
        .option('-f, --file <path>', 'Read entry from JSON file')
        .option('--audit-file <path>', 'Audit log file path', './audit.jsonl')
        .option('--format <type>', 'Output format (json|table)', 'json')
        .action(async (options) => {
        try {
            const storage = new file_1.FileStorage({
                filePath: options.auditFile,
                createIfMissing: true,
            });
            const logger = new logger_1.AuditLogger(storage);
            let entryOptions;
            if (options.file) {
                // Read from file
                const content = fs.readFileSync(options.file, 'utf-8');
                entryOptions = JSON.parse(content);
            }
            else {
                // Build from CLI options
                entryOptions = {
                    tool: options.tool,
                    command: options.command,
                    toolVersion: options.toolVersion,
                    inputs: options.inputs ? JSON.parse(options.inputs) : {},
                    outputs: options.outputs ? JSON.parse(options.outputs) : {},
                    rationale: options.rationale,
                    warnings: options.warnings ? options.warnings.split(',') : [],
                    compliance: {
                        regulations: options.regulations
                            ? options.regulations.split(',')
                            : [],
                        riskFlags: options.riskFlags ? options.riskFlags.split(',') : [],
                        humanReviewRequired: options.humanReview,
                    },
                    operator: options.operator,
                    sessionId: options.sessionId,
                    loanId: options.loanId,
                    parentAuditId: options.parentId,
                    durationMs: options.duration ? parseInt(options.duration) : undefined,
                };
            }
            const entry = await logger.log(entryOptions);
            if (options.format === 'json') {
                console.log(JSON.stringify(entry, null, 2));
            }
            else {
                console.log(`✓ Audit entry logged: ${entry.auditId}`);
                console.log(`  Timestamp: ${entry.timestamp}`);
                console.log(`  Tool: ${entry.tool} ${entry.command}`);
                console.log(`  Hash: ${entry.entryHash?.substring(0, 16)}...`);
            }
        }
        catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });
    return log;
}
//# sourceMappingURL=log.js.map