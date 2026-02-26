#!/usr/bin/env node
"use strict";
/**
 * auditctl - Immutable audit logging for lending operations
 * Part of the LendCtl Suite
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorage = exports.sanitizeInputs = exports.computeEntryHash = exports.AuditLogger = void 0;
const commander_1 = require("commander");
const log_1 = require("./commands/log");
const query_1 = require("./commands/query");
const verify_1 = require("./commands/verify");
const replay_1 = require("./commands/replay");
const export_1 = require("./commands/export");
const program = new commander_1.Command();
program
    .name('auditctl')
    .description('Immutable audit logging for lending operations - part of the LendCtl Suite')
    .version('0.1.0');
// Add commands
program.addCommand((0, log_1.createLogCommand)());
program.addCommand((0, query_1.createQueryCommand)());
program.addCommand((0, verify_1.createVerifyCommand)());
program.addCommand((0, replay_1.createReplayCommand)());
program.addCommand((0, export_1.createExportCommand)());
program.parse();
// Export library components for programmatic use
var logger_1 = require("./lib/logger");
Object.defineProperty(exports, "AuditLogger", { enumerable: true, get: function () { return logger_1.AuditLogger; } });
Object.defineProperty(exports, "computeEntryHash", { enumerable: true, get: function () { return logger_1.computeEntryHash; } });
Object.defineProperty(exports, "sanitizeInputs", { enumerable: true, get: function () { return logger_1.sanitizeInputs; } });
var file_1 = require("./lib/storage/file");
Object.defineProperty(exports, "FileStorage", { enumerable: true, get: function () { return file_1.FileStorage; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map