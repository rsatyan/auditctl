/**
 * auditctl verify command - Verify integrity of the audit log
 */

import { Command } from 'commander';
import { FileStorage } from '../lib/storage/file';

export function createVerifyCommand(): Command {
  const verify = new Command('verify')
    .description('Verify integrity of the audit log')
    .option('--from <date>', 'Start verification from date (ISO-8601)')
    .option('--audit-file <path>', 'Audit log file path', './audit.jsonl')
    .option('--format <type>', 'Output format (json|table)', 'table')
    .action(async (options) => {
      try {
        const storage = new FileStorage({
          filePath: options.auditFile,
          createIfMissing: false,
        });

        const result = await storage.verifyIntegrity(options.from);

        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('╔════════════════════════════════════════════════════════════════╗');
          console.log('║ AUDIT LOG INTEGRITY VERIFICATION                               ║');
          console.log('╠════════════════════════════════════════════════════════════════╣');
          
          if (result.valid) {
            console.log('║ Status: ✓ VALID - No tampering detected'.padEnd(65) + '║');
          } else {
            console.log('║ Status: ✗ INVALID - Integrity failures detected'.padEnd(65) + '║');
          }
          
          console.log(`║ Entries checked: ${result.entriesChecked}`.padEnd(65) + '║');
          console.log(`║ Valid entries: ${result.validEntries}`.padEnd(65) + '║');
          console.log(`║ Invalid entries: ${result.invalidEntries}`.padEnd(65) + '║');
          
          if (result.failures.length > 0) {
            console.log('╠════════════════════════════════════════════════════════════════╣');
            console.log('║ FAILURES:'.padEnd(65) + '║');
            result.failures.forEach((f, i) => {
              console.log(`║ ${i + 1}. ${f.auditId.substring(0, 8)}... at ${f.timestamp}`.padEnd(65) + '║');
              console.log(`║    Reason: ${f.reason}`.padEnd(65) + '║');
            });
          }
          
          console.log('╚════════════════════════════════════════════════════════════════╝');
        }

        // Exit with error code if invalid
        if (!result.valid) {
          process.exit(1);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  return verify;
}
