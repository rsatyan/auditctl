/**
 * auditctl export command - Export audit entries for compliance/examination
 */

import { Command } from 'commander';
import * as fs from 'fs';
import { FileStorage } from '../lib/storage/file';
import { AuditEntry, ExportFormat } from '../types';

function formatAsCSV(entries: AuditEntry[]): string {
  const headers = [
    'audit_id',
    'timestamp',
    'tool',
    'command',
    'tool_version',
    'operator',
    'loan_id',
    'session_id',
    'rationale',
    'warnings',
    'regulations',
    'risk_flags',
    'human_review_required',
    'duration_ms',
    'entry_hash',
  ];

  const rows = entries.map((e) => [
    e.auditId,
    e.timestamp,
    e.tool,
    e.command,
    e.toolVersion,
    e.operator,
    e.loanId || '',
    e.sessionId || '',
    `"${e.rationale.replace(/"/g, '""')}"`,
    `"${e.warnings.join('; ')}"`,
    `"${e.compliance.regulations.join('; ')}"`,
    `"${e.compliance.riskFlags.join('; ')}"`,
    e.compliance.humanReviewRequired ? 'true' : 'false',
    e.durationMs?.toString() || '',
    e.entryHash || '',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function formatAsOCC(entries: AuditEntry[]): string {
  // OCC examination format - structured for regulatory review
  const output = {
    exportDate: new Date().toISOString(),
    exportFormat: 'OCC Examination Ready',
    totalEntries: entries.length,
    dateRange: {
      start: entries.length > 0 ? entries[0].timestamp : null,
      end: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
    },
    summary: {
      byTool: {} as Record<string, number>,
      byRegulation: {} as Record<string, number>,
      riskFlagged: entries.filter((e) => e.compliance.riskFlags.length > 0).length,
      humanReviewRequired: entries.filter((e) => e.compliance.humanReviewRequired).length,
    },
    entries: entries.map((e) => ({
      auditId: e.auditId,
      timestamp: e.timestamp,
      tool: e.tool,
      command: e.command,
      toolVersion: e.toolVersion,
      operator: e.operator,
      loanId: e.loanId,
      rationale: e.rationale,
      warnings: e.warnings,
      compliance: e.compliance,
      integrityHash: e.entryHash,
    })),
  };

  // Build summaries
  entries.forEach((e) => {
    output.summary.byTool[e.tool] = (output.summary.byTool[e.tool] || 0) + 1;
    e.compliance.regulations.forEach((reg) => {
      output.summary.byRegulation[reg] = (output.summary.byRegulation[reg] || 0) + 1;
    });
  });

  return JSON.stringify(output, null, 2);
}

function formatAsCFPB(entries: AuditEntry[]): string {
  // CFPB fair lending analysis format
  const output = {
    exportDate: new Date().toISOString(),
    exportFormat: 'CFPB Fair Lending Analysis',
    totalDecisions: entries.filter((e) => 
      e.outputs && typeof e.outputs === 'object' && 'decision' in e.outputs
    ).length,
    entries: entries
      .filter((e) => e.outputs && typeof e.outputs === 'object' && 'decision' in e.outputs)
      .map((e) => ({
        auditId: e.auditId,
        timestamp: e.timestamp,
        loanId: e.loanId,
        decision: (e.outputs as any).decision,
        adverseActionReasons: (e.outputs as any).adverseActionReasons,
        rationale: e.rationale,
        ecoapCompliant: e.compliance.regulations.includes('ECOA'),
        riskFlags: e.compliance.riskFlags,
      })),
  };

  return JSON.stringify(output, null, 2);
}

export function createExportCommand(): Command {
  const exportCmd = new Command('export')
    .description('Export audit entries for compliance/examination')
    .requiredOption('--format <type>', 'Export format (json|jsonl|csv|occ|cfpb)')
    .option('--start-date <date>', 'Start of date range (ISO-8601)')
    .option('--end-date <date>', 'End of date range (ISO-8601)')
    .option('--loan-id <id>', 'Filter by loan ID')
    .option('--tool <name>', 'Filter by tool name')
    .option('-o, --output <path>', 'Output file path (stdout if not specified)')
    .option('--audit-file <path>', 'Audit log file path', './audit.jsonl')
    .action(async (options) => {
      try {
        const storage = new FileStorage({
          filePath: options.auditFile,
          createIfMissing: false,
        });

        const entries = await storage.query({
          startDate: options.startDate,
          endDate: options.endDate,
          loanId: options.loanId,
          tool: options.tool,
        });

        let output: string;

        switch (options.format as ExportFormat) {
          case 'json':
            output = JSON.stringify(entries, null, 2);
            break;
          case 'jsonl':
            output = entries.map((e) => JSON.stringify(e)).join('\n');
            break;
          case 'csv':
            output = formatAsCSV(entries);
            break;
          case 'occ':
            output = formatAsOCC(entries);
            break;
          case 'cfpb':
            output = formatAsCFPB(entries);
            break;
          default:
            console.error(`Unknown format: ${options.format}`);
            process.exit(1);
        }

        if (options.output) {
          fs.writeFileSync(options.output, output);
          console.log(`Exported ${entries.length} entries to ${options.output}`);
        } else {
          console.log(output);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  return exportCmd;
}
