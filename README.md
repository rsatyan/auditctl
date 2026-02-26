# auditctl

Immutable audit logging for lending operations. Part of the **LendCtl Suite**.

## Features

- **Append-only logging** — Immutable JSONL format prevents tampering
- **Hash chaining** — SHA-256 linked entries detect modifications
- **Compliance-ready** — Built-in support for ECOA, TRID, HMDA, and more
- **Exam exports** — OCC, CFPB, and standard formats
- **PII sanitization** — Automatic redaction of sensitive data
- **Decision tracking** — Special support for adverse action logging

## Installation

```bash
npm install -g auditctl
```

Or use directly with npx:

```bash
npx auditctl --help
```

## Quick Start

### Log an Entry

```bash
auditctl log \
  --tool finctl \
  --command "income w2" \
  --version "0.1.0" \
  --inputs '{"base": 85000, "overtime": 12000}' \
  --outputs '{"monthlyIncome": 8083.33, "annualIncome": 97000}' \
  --rationale "W-2 income calculated per Fannie Mae B3-3.1-01" \
  --regulations "ECOA,Reg B" \
  --operator "processor@bank.com" \
  --loan-id "LOAN-2026-001"
```

### Query Entries

```bash
# Find all entries for a loan
auditctl query --loan-id LOAN-2026-001 --format table

# Find entries with risk flags
auditctl query --has-risk-flags --format summary

# Filter by date range
auditctl query --start-date 2026-01-01 --end-date 2026-01-31
```

### Verify Integrity

```bash
# Verify entire audit log
auditctl verify

# Verify from a specific date
auditctl verify --from 2026-01-01
```

### Replay an Entry

```bash
# View full details and verify a specific entry
auditctl replay --id abc123-def456
```

### Export for Examination

```bash
# Export for OCC examination
auditctl export --format occ --output exam-2026.json

# Export as CSV for analysis
auditctl export --format csv --loan-id LOAN-2026-001 --output loan-audit.csv

# Export fair lending decisions for CFPB
auditctl export --format cfpb --start-date 2025-01-01 --output fair-lending.json
```

## Programmatic Usage

```typescript
import { AuditLogger, FileStorage } from 'auditctl';

// Initialize
const storage = new FileStorage({ filePath: './audit.jsonl' });
const logger = new AuditLogger(storage, { defaultOperator: 'system' });

// Log an entry
const entry = await logger.log({
  tool: 'finctl',
  command: 'income w2',
  toolVersion: '0.1.0',
  inputs: { base: 85000, overtime: 12000 },
  outputs: { monthlyIncome: 8083.33 },
  rationale: 'W-2 income calculated per Fannie Mae B3-3.1-01',
  compliance: {
    regulations: ['ECOA', 'Reg B'],
    riskFlags: [],
    humanReviewRequired: false,
  },
  loanId: 'LOAN-2026-001',
});

console.log(`Logged: ${entry.auditId}`);

// Log a decision with adverse action support
const decision = await logger.logDecision({
  tool: 'decctl',
  command: 'decide',
  toolVersion: '0.1.0',
  inputs: { loanId: 'LOAN-2026-001' },
  outputs: {},
  rationale: 'DTI exceeds program maximum',
  decision: 'declined',
  declineReasons: ['Debt-to-income ratio too high'],
});

// Query entries
const entries = await logger.query({
  loanId: 'LOAN-2026-001',
  tool: 'finctl',
});

// Verify integrity
const result = await logger.verifyIntegrity();
console.log(`Valid: ${result.valid}, Entries: ${result.entriesChecked}`);
```

## Audit Entry Structure

Every entry contains:

```json
{
  "auditId": "uuid",
  "timestamp": "2026-02-26T01:30:00.000Z",
  "tool": "finctl",
  "command": "income w2",
  "toolVersion": "0.1.0",
  "inputs": { "base": 85000 },
  "outputs": { "monthlyIncome": 7083.33 },
  "rationale": "Explanation of the calculation or decision",
  "warnings": ["Any warnings generated"],
  "compliance": {
    "regulations": ["ECOA", "TRID"],
    "riskFlags": [],
    "humanReviewRequired": false
  },
  "operator": "user@bank.com",
  "sessionId": "session-uuid",
  "loanId": "LOAN-2026-001",
  "durationMs": 45,
  "previousHash": "sha256-of-previous-entry",
  "entryHash": "sha256-of-this-entry"
}
```

## Storage Backends

### File Storage (Default)

Append-only JSONL file:

```bash
auditctl log --audit-file ./audit.jsonl ...
```

### Custom Storage

Implement the `AuditStorage` interface:

```typescript
import { AuditStorage, AuditEntry, AuditQueryOptions } from 'auditctl';

class MyStorage implements AuditStorage {
  async append(entry: AuditEntry): Promise<void> { /* ... */ }
  async query(options: AuditQueryOptions): Promise<AuditEntry[]> { /* ... */ }
  async getById(auditId: string): Promise<AuditEntry | null> { /* ... */ }
  async getLastEntry(): Promise<AuditEntry | null> { /* ... */ }
  async verifyIntegrity(fromDate?: string): Promise<IntegrityResult> { /* ... */ }
  async count(options?: AuditQueryOptions): Promise<number> { /* ... */ }
}
```

## Compliance Features

### Automatic PII Redaction

Sensitive fields are automatically redacted:

```typescript
// Input
{ ssn: "123-45-6789", income: 85000 }

// Logged as
{ ssn: "[REDACTED]", income: 85000 }
```

### Adverse Action Support

When logging declines, adverse action reasons are automatically tracked:

```typescript
await logger.logDecision({
  decision: 'declined',
  declineReasons: ['DTI exceeds maximum', 'Insufficient credit history'],
  // ...
});
```

### Hash Chain Verification

Every entry links to the previous via SHA-256:

```
Entry 1 [hash: abc123]
    ↓
Entry 2 [previousHash: abc123, hash: def456]
    ↓
Entry 3 [previousHash: def456, hash: ghi789]
```

Tampering with any entry breaks the chain and is detected by `auditctl verify`.

## Part of LendCtl Suite

auditctl is the audit foundation for the LendCtl lending CLI suite:

- `finctl` — Income and DTI calculations
- `mortctl` — Mortgage underwriting
- `autoctl` — Auto loan underwriting
- `cardctl` — Credit card decisioning
- `persctl` — Personal loan calculations
- `compctl` — Compliance checking
- `decctl` — Decision engine
- And more...

## License

Apache-2.0 © Satyan Avatara
