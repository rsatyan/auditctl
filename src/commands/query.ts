/**
 * auditctl query command - Search the audit log
 */

import { Command } from 'commander';
import { FileStorage } from '../lib/storage/file';
import { AuditQueryOptions } from '../types';

export function createQueryCommand(): Command {
  const query = new Command('query')
    .description('Query audit entries')
    .option('--loan-id <id>', 'Filter by loan ID')
    .option('--tool <name>', 'Filter by tool name')
    .option('--command <cmd>', 'Filter by command')
    .option('--operator <name>', 'Filter by operator')
    .option('--session-id <id>', 'Filter by session ID')
    .option('--start-date <date>', 'Start of date range (ISO-8601)')
    .option('--end-date <date>', 'End of date range (ISO-8601)')
    .option('--has-risk-flags', 'Only entries with risk flags')
    .option('--human-review', 'Only entries requiring human review')
    .option('--limit <n>', 'Maximum entries to return', '100')
    .option('--offset <n>', 'Offset for pagination', '0')
    .option('--audit-file <path>', 'Audit log file path', './audit.jsonl')
    .option('--format <type>', 'Output format (json|jsonl|table|summary)', 'json')
    .action(async (options) => {
      try {
        const storage = new FileStorage({
          filePath: options.auditFile,
          createIfMissing: false,
        });

        const queryOptions: AuditQueryOptions = {
          loanId: options.loanId,
          tool: options.tool,
          command: options.command,
          operator: options.operator,
          sessionId: options.sessionId,
          startDate: options.startDate,
          endDate: options.endDate,
          hasRiskFlags: options.hasRiskFlags || undefined,
          humanReviewRequired: options.humanReview || undefined,
          limit: parseInt(options.limit),
          offset: parseInt(options.offset),
        };

        const entries = await storage.query(queryOptions);
        const totalCount = await storage.count(queryOptions);

        switch (options.format) {
          case 'json':
            console.log(JSON.stringify(entries, null, 2));
            break;

          case 'jsonl':
            entries.forEach((e) => console.log(JSON.stringify(e)));
            break;

          case 'summary':
            console.log(`Found ${totalCount} entries\n`);
            entries.forEach((e) => {
              console.log(`${e.auditId.substring(0, 8)} | ${e.timestamp} | ${e.tool} ${e.command}`);
              if (e.compliance.riskFlags.length > 0) {
                console.log(`  ⚠ Risk flags: ${e.compliance.riskFlags.join(', ')}`);
              }
            });
            break;

          case 'table':
          default:
            console.log('╔════════════════════════════════════════════════════════════════╗');
            console.log('║ AUDIT QUERY RESULTS                                            ║');
            console.log('╠════════════════════════════════════════════════════════════════╣');
            console.log(`║ Total entries: ${totalCount.toString().padEnd(48)}║`);
            console.log(`║ Showing: ${entries.length} (offset ${options.offset})`.padEnd(65) + '║');
            console.log('╠════════════════════════════════════════════════════════════════╣');
            
            entries.forEach((e, i) => {
              if (i > 0) {
                console.log('├────────────────────────────────────────────────────────────────┤');
              }
              console.log(`║ ID: ${e.auditId.substring(0, 8)}...`.padEnd(65) + '║');
              console.log(`║ Time: ${e.timestamp}`.padEnd(65) + '║');
              console.log(`║ Tool: ${e.tool} ${e.command} (v${e.toolVersion})`.padEnd(65) + '║');
              if (e.loanId) {
                console.log(`║ Loan: ${e.loanId}`.padEnd(65) + '║');
              }
              console.log(`║ Operator: ${e.operator}`.padEnd(65) + '║');
              if (e.warnings.length > 0) {
                console.log(`║ ⚠ Warnings: ${e.warnings.join(', ')}`.padEnd(65) + '║');
              }
              if (e.compliance.riskFlags.length > 0) {
                console.log(`║ 🚨 Risk: ${e.compliance.riskFlags.join(', ')}`.padEnd(65) + '║');
              }
            });
            
            console.log('╚════════════════════════════════════════════════════════════════╝');
            break;
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  return query;
}
