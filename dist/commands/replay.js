"use strict";
/**
 * auditctl replay command - Replay and verify a specific audit entry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReplayCommand = createReplayCommand;
const commander_1 = require("commander");
const file_1 = require("../lib/storage/file");
const logger_1 = require("../lib/logger");
function createReplayCommand() {
    const replay = new commander_1.Command('replay')
        .description('Replay and verify a specific audit entry')
        .requiredOption('--id <auditId>', 'Audit entry ID to replay')
        .option('--audit-file <path>', 'Audit log file path', './audit.jsonl')
        .option('--format <type>', 'Output format (json|table)', 'table')
        .action(async (options) => {
        try {
            const storage = new file_1.FileStorage({
                filePath: options.auditFile,
                createIfMissing: false,
            });
            const entry = await storage.getById(options.id);
            if (!entry) {
                console.error(`Error: Audit entry not found: ${options.id}`);
                process.exit(1);
            }
            // Verify the entry hash
            const { entryHash, ...entryWithoutHash } = entry;
            const computedHash = (0, logger_1.computeEntryHash)(entryWithoutHash);
            const hashValid = computedHash === entryHash;
            if (options.format === 'json') {
                console.log(JSON.stringify({
                    entry,
                    verification: {
                        hashValid,
                        computedHash,
                        storedHash: entryHash,
                    },
                }, null, 2));
            }
            else {
                console.log('╔════════════════════════════════════════════════════════════════╗');
                console.log('║ AUDIT ENTRY REPLAY                                             ║');
                console.log('╠════════════════════════════════════════════════════════════════╣');
                console.log(`║ Audit ID: ${entry.auditId}`.padEnd(65) + '║');
                console.log(`║ Timestamp: ${entry.timestamp}`.padEnd(65) + '║');
                console.log(`║ Tool: ${entry.tool} ${entry.command} (v${entry.toolVersion})`.padEnd(65) + '║');
                console.log(`║ Operator: ${entry.operator}`.padEnd(65) + '║');
                if (entry.loanId) {
                    console.log(`║ Loan ID: ${entry.loanId}`.padEnd(65) + '║');
                }
                if (entry.sessionId) {
                    console.log(`║ Session: ${entry.sessionId.substring(0, 8)}...`.padEnd(65) + '║');
                }
                console.log('╠════════════════════════════════════════════════════════════════╣');
                console.log('║ INPUTS:'.padEnd(65) + '║');
                const inputStr = JSON.stringify(entry.inputs, null, 2);
                inputStr.split('\n').forEach((line) => {
                    console.log(`║   ${line}`.padEnd(65) + '║');
                });
                console.log('╠════════════════════════════════════════════════════════════════╣');
                console.log('║ OUTPUTS:'.padEnd(65) + '║');
                const outputStr = JSON.stringify(entry.outputs, null, 2);
                outputStr.split('\n').forEach((line) => {
                    console.log(`║   ${line}`.padEnd(65) + '║');
                });
                console.log('╠════════════════════════════════════════════════════════════════╣');
                console.log('║ RATIONALE:'.padEnd(65) + '║');
                console.log(`║   ${entry.rationale}`.padEnd(65) + '║');
                if (entry.warnings.length > 0) {
                    console.log('╠════════════════════════════════════════════════════════════════╣');
                    console.log('║ WARNINGS:'.padEnd(65) + '║');
                    entry.warnings.forEach((w) => {
                        console.log(`║   ⚠ ${w}`.padEnd(65) + '║');
                    });
                }
                console.log('╠════════════════════════════════════════════════════════════════╣');
                console.log('║ COMPLIANCE:'.padEnd(65) + '║');
                console.log(`║   Regulations: ${entry.compliance.regulations.join(', ') || 'None'}`.padEnd(65) + '║');
                console.log(`║   Risk Flags: ${entry.compliance.riskFlags.join(', ') || 'None'}`.padEnd(65) + '║');
                console.log(`║   Human Review: ${entry.compliance.humanReviewRequired ? 'Required' : 'Not required'}`.padEnd(65) + '║');
                console.log('╠════════════════════════════════════════════════════════════════╣');
                console.log('║ VERIFICATION:'.padEnd(65) + '║');
                if (hashValid) {
                    console.log('║   ✓ Hash verified - Entry has not been tampered with'.padEnd(65) + '║');
                }
                else {
                    console.log('║   ✗ HASH MISMATCH - Entry may have been modified!'.padEnd(65) + '║');
                    console.log(`║   Stored:   ${entryHash?.substring(0, 32)}...`.padEnd(65) + '║');
                    console.log(`║   Computed: ${computedHash.substring(0, 32)}...`.padEnd(65) + '║');
                }
                console.log('╚════════════════════════════════════════════════════════════════╝');
            }
            if (!hashValid) {
                process.exit(1);
            }
        }
        catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });
    return replay;
}
//# sourceMappingURL=replay.js.map