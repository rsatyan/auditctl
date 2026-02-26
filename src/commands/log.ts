/**
 * auditctl log command - Add entries to the audit log
 */

import { Command } from 'commander';
import * as fs from 'fs';
import { AuditLogger } from '../lib/logger';
import { FileStorage } from '../lib/storage/file';

export function createLogCommand(): Command {
  const log = new Command('log')
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
        const storage = new FileStorage({
          filePath: options.auditFile,
          createIfMissing: true,
        });
        const logger = new AuditLogger(storage);

        let entryOptions: any;

        if (options.file) {
          // Read from file
          const content = fs.readFileSync(options.file, 'utf-8');
          entryOptions = JSON.parse(content);
        } else {
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
        } else {
          console.log(`✓ Audit entry logged: ${entry.auditId}`);
          console.log(`  Timestamp: ${entry.timestamp}`);
          console.log(`  Tool: ${entry.tool} ${entry.command}`);
          console.log(`  Hash: ${entry.entryHash?.substring(0, 16)}...`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  return log;
}
