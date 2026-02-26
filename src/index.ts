#!/usr/bin/env node

/**
 * auditctl - Immutable audit logging for lending operations
 * Part of the LendCtl Suite
 */

import { Command } from 'commander';
import { createLogCommand } from './commands/log';
import { createQueryCommand } from './commands/query';
import { createVerifyCommand } from './commands/verify';
import { createReplayCommand } from './commands/replay';
import { createExportCommand } from './commands/export';

const program = new Command();

program
  .name('auditctl')
  .description('Immutable audit logging for lending operations - part of the LendCtl Suite')
  .version('0.1.0');

// Add commands
program.addCommand(createLogCommand());
program.addCommand(createQueryCommand());
program.addCommand(createVerifyCommand());
program.addCommand(createReplayCommand());
program.addCommand(createExportCommand());

program.parse();

// Export library components for programmatic use
export { AuditLogger, computeEntryHash, sanitizeInputs } from './lib/logger';
export { FileStorage } from './lib/storage/file';
export * from './types';
