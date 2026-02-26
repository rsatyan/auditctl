import * as fs from 'fs';
import * as path from 'path';
import { AuditLogger, computeEntryHash, sanitizeInputs } from '../src/lib/logger';
import { FileStorage } from '../src/lib/storage/file';
import { AuditEntry } from '../src/types';

const TEST_FILE = path.join(__dirname, 'test-audit.jsonl');

describe('AuditLogger', () => {
  let storage: FileStorage;
  let logger: AuditLogger;

  beforeEach(() => {
    // Clean up test file
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
    storage = new FileStorage({ filePath: TEST_FILE });
    logger = new AuditLogger(storage, { defaultOperator: 'test-user' });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
  });

  describe('log', () => {
    it('should create an audit entry with required fields', async () => {
      const entry = await logger.log({
        tool: 'finctl',
        command: 'income w2',
        toolVersion: '0.1.0',
        inputs: { base: 85000 },
        outputs: { monthlyIncome: 7083.33 },
        rationale: 'W-2 base income calculation',
      });

      expect(entry.auditId).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.tool).toBe('finctl');
      expect(entry.command).toBe('income w2');
      expect(entry.toolVersion).toBe('0.1.0');
      expect(entry.operator).toBe('test-user');
      expect(entry.entryHash).toBeDefined();
    });

    it('should chain hashes correctly', async () => {
      const entry1 = await logger.log({
        tool: 'finctl',
        command: 'income w2',
        toolVersion: '0.1.0',
        inputs: { base: 85000 },
        outputs: { monthlyIncome: 7083.33 },
        rationale: 'First entry',
      });

      const entry2 = await logger.log({
        tool: 'finctl',
        command: 'dti',
        toolVersion: '0.1.0',
        inputs: { income: 7083 },
        outputs: { dti: 35 },
        rationale: 'Second entry',
      });

      expect(entry2.previousHash).toBe(entry1.entryHash);
    });

    it('should include compliance information', async () => {
      const entry = await logger.log({
        tool: 'decctl',
        command: 'decide',
        toolVersion: '0.1.0',
        inputs: {},
        outputs: { decision: 'approved' },
        rationale: 'Meets all requirements',
        compliance: {
          regulations: ['ECOA', 'TRID'],
          riskFlags: [],
          humanReviewRequired: false,
        },
      });

      expect(entry.compliance.regulations).toContain('ECOA');
      expect(entry.compliance.regulations).toContain('TRID');
    });
  });

  describe('logDecision', () => {
    it('should add ECOA regulation for decisions', async () => {
      const entry = await logger.logDecision({
        tool: 'decctl',
        command: 'decide',
        toolVersion: '0.1.0',
        inputs: {},
        outputs: {},
        rationale: 'Approved',
        decision: 'approved',
      });

      expect(entry.compliance.regulations).toContain('ECOA');
      expect(entry.compliance.regulations).toContain('Reg B');
    });

    it('should track adverse action reasons for declines', async () => {
      const entry = await logger.logDecision({
        tool: 'decctl',
        command: 'decide',
        toolVersion: '0.1.0',
        inputs: {},
        outputs: {},
        rationale: 'DTI too high',
        decision: 'declined',
        declineReasons: ['DTI exceeds 43%', 'Insufficient credit history'],
      });

      expect(entry.outputs.decision).toBe('declined');
      expect(entry.outputs.adverseActionReasons).toContain('DTI exceeds 43%');
      expect(entry.compliance.humanReviewRequired).toBe(true);
    });
  });

  describe('verifyIntegrity', () => {
    it('should pass verification for valid chain', async () => {
      await logger.log({
        tool: 'test',
        command: 'test1',
        toolVersion: '1.0.0',
        inputs: {},
        outputs: {},
        rationale: 'Test 1',
      });

      await logger.log({
        tool: 'test',
        command: 'test2',
        toolVersion: '1.0.0',
        inputs: {},
        outputs: {},
        rationale: 'Test 2',
      });

      const result = await logger.verifyIntegrity();

      expect(result.valid).toBe(true);
      expect(result.entriesChecked).toBe(2);
      expect(result.invalidEntries).toBe(0);
    });
  });
});

describe('sanitizeInputs', () => {
  it('should redact SSN', () => {
    const input = { ssn: '123-45-6789', income: 85000 };
    const sanitized = sanitizeInputs(input);

    expect(sanitized.ssn).toBe('[REDACTED]');
    expect(sanitized.income).toBe(85000);
  });

  it('should redact nested sensitive fields', () => {
    const input = {
      borrower: {
        name: 'John',
        socialSecurity: '123-45-6789',
      },
    };
    const sanitized = sanitizeInputs(input);

    expect((sanitized.borrower as any).name).toBe('John');
    expect((sanitized.borrower as any).socialSecurity).toBe('[REDACTED]');
  });

  it('should redact API keys and tokens', () => {
    const input = { apiKey: 'secret123', data: 'public' };
    const sanitized = sanitizeInputs(input);

    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.data).toBe('public');
  });
});

describe('computeEntryHash', () => {
  it('should produce consistent hashes', () => {
    const entry = {
      auditId: 'test-123',
      timestamp: '2026-02-26T00:00:00.000Z',
      tool: 'finctl',
      command: 'income',
      toolVersion: '0.1.0',
      inputs: { base: 85000 },
      outputs: { monthly: 7083 },
      rationale: 'Test',
      warnings: [],
      compliance: {
        regulations: [],
        riskFlags: [],
        humanReviewRequired: false,
      },
      operator: 'test',
    };

    const hash1 = computeEntryHash(entry);
    const hash2 = computeEntryHash(entry);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });

  it('should produce different hashes for different inputs', () => {
    const base = {
      auditId: 'test-123',
      timestamp: '2026-02-26T00:00:00.000Z',
      tool: 'finctl',
      command: 'income',
      toolVersion: '0.1.0',
      inputs: { base: 85000 },
      outputs: { monthly: 7083 },
      rationale: 'Test',
      warnings: [],
      compliance: {
        regulations: [],
        riskFlags: [],
        humanReviewRequired: false,
      },
      operator: 'test',
    };

    const modified = { ...base, inputs: { base: 90000 } };

    const hash1 = computeEntryHash(base);
    const hash2 = computeEntryHash(modified);

    expect(hash1).not.toBe(hash2);
  });
});
