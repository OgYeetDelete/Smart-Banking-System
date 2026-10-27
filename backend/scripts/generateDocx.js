/**
 * generateDocx.js
 * Generates a real Microsoft Word .docx file from the project report.
 * Uses only Node.js built-in modules (no external dependencies).
 *
 * Run: node scripts/generateDocx.js
 * Output: ../FINAL_PROJECT_REPORT_REVIEW_3.docx
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── CRC32 Table ────────────────────────────────────────────────────────────
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}
const CRC_TABLE = makeCrcTable();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── ZIP Builder ─────────────────────────────────────────────────────────────
function writeUint16LE(val) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(val, 0);
  return b;
}
function writeUint32LE(val) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(val >>> 0, 0);
  return b;
}

function buildZip(files) {
  // files: array of { name: string, data: Buffer }
  const localHeaders = [];
  const centralDirs = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, 'utf8');
    const data = file.data;
    const crc = crc32(data);
    const size = data.length;

    // Local file header
    const localHeader = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]), // signature
      writeUint16LE(20),      // version needed
      writeUint16LE(0),       // flags
      writeUint16LE(0),       // compression: stored
      writeUint16LE(0),       // mod time
      writeUint16LE(0),       // mod date
      writeUint32LE(crc),     // crc32
      writeUint32LE(size),    // compressed size
      writeUint32LE(size),    // uncompressed size
      writeUint16LE(nameBytes.length), // filename length
      writeUint16LE(0),       // extra field length
      nameBytes,
      data,
    ]);

    localHeaders.push(localHeader);

    // Central directory entry
    const central = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x01, 0x02]), // signature
      writeUint16LE(20),      // version made by
      writeUint16LE(20),      // version needed
      writeUint16LE(0),       // flags
      writeUint16LE(0),       // compression: stored
      writeUint16LE(0),       // mod time
      writeUint16LE(0),       // mod date
      writeUint32LE(crc),     // crc32
      writeUint32LE(size),    // compressed size
      writeUint32LE(size),    // uncompressed size
      writeUint16LE(nameBytes.length),
      writeUint16LE(0),       // extra field length
      writeUint16LE(0),       // file comment length
      writeUint16LE(0),       // disk number start
      writeUint16LE(0),       // internal attributes
      writeUint32LE(0),       // external attributes
      writeUint32LE(offset),  // local header offset
      nameBytes,
    ]);

    centralDirs.push(central);
    offset += localHeader.length;
  }

  const centralDirData = Buffer.concat(centralDirs);
  const centralDirSize = centralDirData.length;
  const centralDirOffset = offset;

  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x05, 0x06]), // End of central directory signature
    writeUint16LE(0),                        // disk number
    writeUint16LE(0),                        // central dir disk
    writeUint16LE(files.length),             // entries on disk
    writeUint16LE(files.length),             // total entries
    writeUint32LE(centralDirSize),           // central dir size
    writeUint32LE(centralDirOffset),         // central dir offset
    writeUint16LE(0),                        // comment length
  ]);

  return Buffer.concat([...localHeaders, centralDirData, eocd]);
}

// ─── OOXML Helper ────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Paragraph styles
function para(text, style = 'Normal', extra = '') {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function heading1(text) { return para(text, 'Heading1'); }
function heading2(text) { return para(text, 'Heading2'); }
function heading3(text) { return para(text, 'Heading3'); }
function normal(text) { return para(text, 'Normal'); }
function bullet(text) { return para(text, 'ListBullet'); }

function boldPara(label, rest = '') {
  const restEsc = esc(rest);
  return `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${esc(label)}</w:t></w:r><w:r><w:t xml:space="preserve">${restEsc}</w:t></w:r></w:p>`;
}

function codePara(text) { return para(text, 'CodeBlock'); }

function tableRow(cells, isHeader = false) {
  const cellXml = cells.map(c => {
    const rpr = isHeader ? '<w:rPr><w:b/></w:rPr>' : '';
    return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/><w:shd w:val="${isHeader ? 'clear' : 'nil'}" w:color="auto" w:fill="${isHeader ? 'D0E4FF' : 'auto'}"/></w:tcPr><w:p><w:r>${rpr}<w:t xml:space="preserve">${esc(c)}</w:t></w:r></w:p></w:tc>`;
  }).join('');
  return `<w:tr>${cellXml}</w:tr>`;
}

function table(headers, rows) {
  const tblPr = `<w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:left w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:right w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="4472C4"/></w:tblBorders></w:tblPr>`;
  const headerRow = tableRow(headers, true);
  const bodyRows = rows.map(r => tableRow(r)).join('');
  return `<w:tbl>${tblPr}${headerRow}${bodyRows}</w:tbl>`;
}

function emptyLine() {
  return `<w:p><w:pPr><w:jc w:val="left"/></w:pPr></w:p>`;
}

function hrLine() {
  return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="4472C4"/></w:pBdr></w:pPr></w:p>`;
}

// ─── Build Document Body ──────────────────────────────────────────────────────
function buildDocumentXml() {
  const body = [];

  // Title block
  body.push(`<w:p><w:pPr><w:pStyle w:val="Title"/><w:jc w:val="center"/></w:pPr><w:r><w:t>Smart Digital Banking System</w:t></w:r></w:p>`);
  body.push(`<w:p><w:pPr><w:pStyle w:val="Subtitle"/><w:jc w:val="center"/></w:pPr><w:r><w:t>with Real-Time Fraud Detection</w:t></w:r></w:p>`);
  body.push(emptyLine());
  body.push(boldPara('Academic Evaluation: ', 'Database Management Systems — Capstone Project (Review 3)'));
  body.push(boldPara('Authors: ', 'Srijan Sengupta (24BCE2218) | Shubho Das (24BCE2276)'));
  body.push(boldPara('Date: ', 'October 2026'));
  body.push(boldPara('Repository: ', 'github.com/OgYeetDelete/Smart-Banking-System'));
  body.push(hrLine());
  body.push(emptyLine());

  // 1. Executive Summary
  body.push(heading1('1. Executive Summary & Abstract'));
  body.push(normal('The Smart Digital Banking System with Real-Time Fraud Detection is a full-stack, enterprise-grade financial technology application designed to demonstrate advanced database engineering beyond basic CRUD operations. Built on Node.js, Express 5, React 18, and MongoDB Atlas, the system delivers atomic fund transfers, real-time transaction surveillance, automated risk scoring, multi-tier data lifecycle management, and complex financial reporting.'));
  body.push(emptyLine());
  body.push(normal('In conventional web architectures, fraud detection is performed using asynchronous batch analytics scheduled hours or days after transactions commit. This project demonstrates an event-driven database pattern: MongoDB Change Streams listen directly to the database replication log (oplog), evaluating every newly inserted transaction against multi-factor risk heuristics the millisecond it is committed, and writing live, time-bounded alerts to administrators without polling or blocking client transfers.'));
  body.push(emptyLine());
  body.push(normal('Financial integrity is enforced at the database layer using Multi-Document ACID Transactions, strict $jsonSchema validation constraints (guaranteeing non-negative balances), compound B-tree indexes validated through explain("executionStats") benchmarks, and Time-To-Live (TTL) indexes that self-purge temporary security alerts and application data.'));
  body.push(hrLine());
  body.push(emptyLine());

  // 2. Architecture
  body.push(heading1('2. System Architecture & Component Design'));
  body.push(normal('The application follows a decoupled three-tier architecture comprising a React 18 frontend, an Express 5 REST API layer, and a MongoDB Atlas database backend.'));
  body.push(emptyLine());

  body.push(heading2('2.1. Tier 1 — Frontend Client Layer (React 18)'));
  body.push(bullet('Customer Portal: Account balances, fund transfers, loan applications, beneficiary management.'));
  body.push(bullet('Admin Fraud Guard: Live suspicious transaction feed, loan approval workflow, aggregation dashboards.'));

  body.push(heading2('2.2. Tier 2 — Application & API Layer (Node.js + Express 5)'));
  body.push(bullet('Express REST Router (/api/*): Routes all authenticated HTTP requests.'));
  body.push(bullet('JWT Auth & RBAC Middleware: Verifies Bearer tokens, enforces admin-only endpoints.'));
  body.push(bullet('Business Logic Controllers: Handles transfers, accounts, loans, beneficiaries.'));
  body.push(bullet('Fraud Detection Engine: 3-factor heuristic risk scorer running on Change Stream events.'));
  body.push(bullet('Change Stream Listener (utils/changeStream.js): Tails the MongoDB oplog in real time.'));

  body.push(heading2('2.3. Tier 3 — Database Storage Layer (MongoDB Atlas Replica Set)'));
  body.push(bullet('Multi-Document ACID Transactions: Atomic session-based debit/credit commits.'));
  body.push(bullet('Primary Replica Node (bankingDB): Cloud-hosted collections on Atlas Cluster0.'));
  body.push(bullet('MongoDB Replication Log (oplog.rs): Event stream driving real-time fraud detection.'));
  body.push(bullet('Compound & TTL Indexes: B-Tree query acceleration + automated data lifecycle expiry.'));
  body.push(hrLine());
  body.push(emptyLine());

  // 3. Technology Stack
  body.push(heading1('3. Technology Stack'));
  body.push(table(
    ['Tier', 'Technology', 'Version', 'Function in System'],
    [
      ['Frontend', 'React.js', '18.3.1', 'Single-Page Application (SPA) — Customer Banking Dashboard, Transfer Modals, Admin Fraud Center.'],
      ['Backend', 'Node.js', 'v24.x', 'Non-blocking, event-driven JavaScript server runtime.'],
      ['Web Framework', 'Express.js', '5.2.1', 'REST API routing, JSON body parsing, and SPA asset serving.'],
      ['ODM Library', 'Mongoose', '9.10.2', 'Schema modeling, relationship management, and Change Stream integration.'],
      ['Database', 'MongoDB Atlas', 'Cluster0', 'Cloud-hosted multi-node Replica Set supporting ACID transactions, oplog streams, and sharding.'],
      ['Security', 'JSON Web Tokens', '9.0.3', 'Stateless authentication with embedded user identity and RBAC role.'],
      ['Cryptography', 'bcryptjs', '3.0.3', '10-round salted one-way hashing for secure credential persistence.'],
    ]
  ));
  body.push(hrLine());
  body.push(emptyLine());

  // 4. Database Schema
  body.push(heading1('4. Comprehensive Database Schema & Collections'));
  body.push(normal('The database "bankingDB" comprises seven normalized, interconnected collections:'));
  body.push(emptyLine());

  body.push(heading2('4.1. customers'));
  body.push(normal('Stores customer profile records and access credentials.'));
  body.push(bullet('Fields: _id (ObjectId), name (String), email (String, Unique Index), password (String, bcrypt hash), phone (String), role (Enum: "customer" | "admin"), createdAt, updatedAt.'));
  body.push(bullet('Constraints: Case-insensitive unique B-tree index on email. Passwords never persisted in plaintext.'));

  body.push(heading2('4.2. accounts'));
  body.push(normal('Represents customer bank accounts.'));
  body.push(bullet('Fields: _id, customerId (ref: Customer), accountNumber (Unique), accountType (Enum: Savings / Current / Salary), balance (Number >= 0).'));
  body.push(bullet('Constraints: Unique index on accountNumber. $jsonSchema validator enforces balance minimum: 0 at database engine level.'));

  body.push(heading2('4.3. transfers'));
  body.push(normal('Immutable audit ledger of completed balance transfers.'));
  body.push(bullet('Fields: _id, fromAccount (String), toAccount (String), amount (Number >= 1), transferredAt (Date, default Date.now).'));
  body.push(bullet('Constraints: Compound Index { fromAccount: 1, transferredAt: -1 }. Multi-document ACID session write.'));

  body.push(heading2('4.4. beneficiaries'));
  body.push(normal('Pre-registered recipient whitelist for customers.'));
  body.push(bullet('Fields: _id, customerId (ref: Customer), beneficiaryName (String), accountNumber (String).'));
  body.push(bullet('Design Note: Decoupled into its own collection (not embedded array) to prevent unbounded document growth — an anti-pattern in MongoDB.'));

  body.push(heading2('4.5. loans'));
  body.push(normal('Customer loan applications with automated disbursement workflow.'));
  body.push(bullet('Fields: _id, customerId (ref: Customer), loanType (Enum: Education / Personal / Home / Vehicle / Business Loan), amount, status (Pending / Approved / Rejected), createdAt.'));
  body.push(bullet('TTL Index: expires: 31536000 (1 year auto-cleanup).'));
  body.push(bullet('Disbursement Hook: Approving a loan atomically credits the borrower account balance and writes a BANK_LOAN_DISBURSEMENT transfer record.'));

  body.push(heading2('4.6. fraudalerts'));
  body.push(normal('Real-time incident repository for suspicious transactions flagged by the heuristic engine.'));
  body.push(bullet('Fields: _id, transferId, fromAccount, toAccount, amount, riskScore (0-100), severity (LOW/MEDIUM/HIGH/CRITICAL), rulesTriggered (Array), status (FLAGGED / UNDER_INVESTIGATION / CLEARED / CONFIRMED_FRAUD), detectedAt.'));
  body.push(bullet('Index: Compound { status: 1, detectedAt: -1 }.'));

  body.push(heading2('4.7. notifications & securitylogs (TTL Collections)'));
  body.push(bullet('notifications: Real-time push alerts with TTL expires: 300 (5 minutes auto-purge).'));
  body.push(bullet('securitylogs: Authentication audit trail (login attempts, IPs, statuses) with TTL expires: 300 (5 minutes).'));
  body.push(hrLine());
  body.push(emptyLine());

  // 5. Advanced Techniques
  body.push(heading1('5. Advanced Database Engineering Techniques'));

  // Pillar 1
  body.push(heading2('Pillar 1: Multi-Document ACID Transactions'));
  body.push(normal('A fundamental banking requirement is that money must never disappear or be fabricated. In fund transfers, three database writes across multiple documents must occur simultaneously or not at all:'));
  body.push(bullet('Write 1 — Debit sender\'s account balance: sender.balance -= amount'));
  body.push(bullet('Write 2 — Credit receiver\'s account balance: receiver.balance += amount'));
  body.push(bullet('Write 3 — Write immutable ledger record into "transfers" collection'));
  body.push(emptyLine());
  body.push(normal('Implementation (controllers/transferController.js):'));
  body.push(codePara('const session = await mongoose.startSession();'));
  body.push(codePara('session.startTransaction();'));
  body.push(codePara('try {'));
  body.push(codePara('    const sender = await Account.findOne({ accountNumber: fromAccount }).session(session);'));
  body.push(codePara('    const receiver = await Account.findOne({ accountNumber: toAccount }).session(session);'));
  body.push(codePara('    if (sender.balance < amount) throw new Error("Insufficient Balance");'));
  body.push(codePara('    sender.balance -= amount; receiver.balance += amount;'));
  body.push(codePara('    await sender.save({ session }); await receiver.save({ session });'));
  body.push(codePara('    await Transfer.create([{ fromAccount, toAccount, amount }], { session });'));
  body.push(codePara('    await session.commitTransaction(); // All 3 writes committed atomically'));
  body.push(codePara('} catch (err) { await session.abortTransaction(); } finally { session.endSession(); }'));
  body.push(emptyLine());
  body.push(normal('Result: Any system failure, balance violation, or concurrent conflict aborts all operations, preserving complete zero-loss consistency.'));
  body.push(emptyLine());

  // Pillar 2
  body.push(heading2('Pillar 2: Real-Time Change Streams & Heuristic Fraud Engine'));
  body.push(normal('Rather than batch queries, the application hooks directly into MongoDB Atlas\'s replication oplog stream:'));
  body.push(emptyLine());
  body.push(codePara('// utils/changeStream.js'));
  body.push(codePara('const transferStream = Transfer.watch();'));
  body.push(codePara('transferStream.on("change", async (change) => {'));
  body.push(codePara('    if (change.operationType === "insert" && change.fullDocument) {'));
  body.push(codePara('        await evaluateTransfer(change.fullDocument);'));
  body.push(codePara('    }'));
  body.push(codePara('});'));
  body.push(emptyLine());
  body.push(heading3('Multi-Factor Fraud Heuristics:'));
  body.push(bullet('Rule 1 (Amount Anomaly): >= Rs.3,000 → +40 points | >= Rs.50,000 → +55 points'));
  body.push(bullet('Rule 2 (Velocity Spike): >= 2 transfers from same account in 5 minutes → +40 points'));
  body.push(bullet('Rule 3 (Unregistered Payee): Recipient not in sender\'s beneficiary whitelist → +35 points'));
  body.push(emptyLine());
  body.push(heading3('Severity & Action Matrix:'));
  body.push(table(
    ['Score Range', 'Severity', 'Action Taken'],
    [
      ['>= 70', 'CRITICAL', 'Writes to fraudalerts, pushes high-priority TTL notifications, logs terminal warning.'],
      ['50 - 69', 'HIGH', 'Flags transfer, creates investigation record in admin console.'],
      ['30 - 49', 'MEDIUM', 'Emits security warning notification to audit ledger.'],
      ['< 30', 'LOW', 'Transaction cleared automatically; no alert generated.'],
    ]
  ));
  body.push(emptyLine());

  // Pillar 3
  body.push(heading2('Pillar 3: Compound Indexing & explain() Benchmark'));
  body.push(normal('To support sub-second velocity checks, a compound index was established on the "transfers" collection:'));
  body.push(codePara('{ fromAccount: 1, transferredAt: -1 }'));
  body.push(normal('Performance validated using explain("executionStats") on a rolling 5-minute velocity query:'));
  body.push(emptyLine());
  body.push(table(
    ['Metric', 'Without Index (COLLSCAN)', 'With Compound Index (IXSCAN)', 'Improvement'],
    [
      ['Execution Plan Stage', 'COLLSCAN (Full Table Scan)', 'IXSCAN (B-Tree Index Scan)', 'Optimal Query Path'],
      ['Documents Examined', 'All documents in collection (N)', 'Matching documents only (k)', '~100x fewer docs read'],
      ['Keys Examined', '0', 'k (direct pointer jump)', 'Direct pointer access'],
      ['Execution Latency', 'High linear growth O(N)', 'Sub-millisecond ~0ms O(log N)', 'Instantaneous lookup'],
    ]
  ));
  body.push(emptyLine());
  body.push(normal('The compound index ensures that as the bank processes millions of transactions, the real-time velocity calculation never degrades or locks server I/O.'));
  body.push(emptyLine());

  // Pillar 4
  body.push(heading2('Pillar 4: Database-Level Schema Validation ($jsonSchema)'));
  body.push(normal('Mongoose validates at the application layer, but true database integrity requires engine-level constraints. Using MongoDB\'s collMod command, validation rules enforce data quality regardless of how the database is accessed:'));
  body.push(emptyLine());
  body.push(codePara('await db.command({ collMod: "accounts", validator: {'));
  body.push(codePara('    $jsonSchema: { bsonType: "object",'));
  body.push(codePara('        required: ["customerId", "accountNumber", "accountType", "balance"],'));
  body.push(codePara('        properties: {'));
  body.push(codePara('            accountType: { enum: ["Savings", "Current", "Salary"] },'));
  body.push(codePara('            balance: { bsonType: "number", minimum: 0 }'));
  body.push(codePara('        }'));
  body.push(codePara('    }'), );
  body.push(codePara('}, validationAction: "error" });'));
  body.push(emptyLine());
  body.push(normal('Result: Attempting to set an invalid accountType or reduce balance below zero is rejected directly by the MongoDB storage engine — not just the application layer.'));
  body.push(emptyLine());

  // Pillar 5
  body.push(heading2('Pillar 5: Time-To-Live (TTL) Data Lifecycle Management'));
  body.push(normal('MongoDB TTL background threads automatically scan date fields and expire documents without manual cron jobs:'));
  body.push(bullet('Short-Lived Alerts (notifications & securitylogs): TTL expires: 300 (5 minutes). High-frequency security broadcasts and failed login attempt logs vanish once reviewed, avoiding disk bloat.'));
  body.push(bullet('Long-Lived Application Records (loans): TTL expires: 31536000 (1 Year). Historic loan applications auto-clean after their legal retention window expires.'));
  body.push(emptyLine());

  // Pillar 6
  body.push(heading2('Pillar 6: Financial Analytics via Aggregation Pipelines'));
  body.push(normal('Complex financial intelligence is computed natively inside MongoDB\'s aggregation engine, not in JavaScript memory:'));
  body.push(emptyLine());
  body.push(heading3('1. Account Portfolio Distribution:'));
  body.push(codePara('Account.aggregate([ { $group: { _id: "$accountType",'));
  body.push(codePara('    totalAccounts: { $sum: 1 }, totalBalance: { $sum: "$balance" },'));
  body.push(codePara('    averageBalance: { $avg: "$balance" } } } ]);'));
  body.push(emptyLine());
  body.push(heading3('2. Loan Portfolio Exposure:'));
  body.push(codePara('Loan.aggregate([ { $group: { _id: "$status",'));
  body.push(codePara('    totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } } ]);'));
  body.push(emptyLine());
  body.push(heading3('3. Fraud Risk Concentration by Severity:'));
  body.push(codePara('FraudAlert.aggregate([ { $group: { _id: "$severity",'));
  body.push(codePara('    count: { $sum: 1 }, totalFlaggedAmount: { $sum: "$amount" },'));
  body.push(codePara('    avgRiskScore: { $avg: "$riskScore" } } },'));
  body.push(codePara('    { $sort: { count: -1 } } ]);'));
  body.push(emptyLine());

  // Pillar 7
  body.push(heading2('Pillar 7: High Availability & Horizontal Scalability'));
  body.push(heading3('Replica Set Architecture:'));
  body.push(normal('Connection string uses replicaSet=atlas-dw03wn-shard-0 across three distributed nodes:'));
  body.push(bullet('ac-j86rkjf-shard-00-00.uuhncy1.mongodb.net:27017'));
  body.push(bullet('ac-j86rkjf-shard-00-01.uuhncy1.mongodb.net:27017'));
  body.push(bullet('ac-j86rkjf-shard-00-02.uuhncy1.mongodb.net:27017'));
  body.push(normal('Failover Mechanism: If the primary node fails, an automated raft election selects one of the secondary replicas as primary in < 3 seconds, ensuring zero transactional downtime.'));
  body.push(emptyLine());
  body.push(heading3('Sharding Strategy for Production Scaling:'));
  body.push(normal('The "transfers" collection is partitioned using a hashed shard key on { fromAccount: "hashed" }. This uniformly distributes transfer writes across physical shards, preventing hot-spotting on any single storage node as volume scales to terabytes.'));
  body.push(hrLine());
  body.push(emptyLine());

  // 6. UI
  body.push(heading1('6. End-to-End User Experience & UI Capabilities'));
  body.push(normal('The web application (served on http://localhost:5000) provides two dedicated, authenticated operational views:'));
  body.push(emptyLine());

  body.push(heading2('6.1. Customer Portal'));
  body.push(bullet('Live Account Balances: Instant display of primary and secondary accounts with dynamic balance updating.'));
  body.push(bullet('Account Opening: Allows customers to open additional Savings, Current, or Salary accounts with schema enforcement.'));
  body.push(bullet('Deposit Simulator: Allows adding test funds to simulate large transaction flows.'));
  body.push(bullet('Fund Transfers: Transfers funds with balance checking, payee selection, and transaction history logging.'));
  body.push(bullet('Beneficiary Management: Add, view, and 1-click select trusted contacts for quick transfers.'));
  body.push(bullet('Loan Applications: Apply for Education, Personal, Home, Vehicle, or Business loans with real-time feedback.'));
  body.push(bullet('Real-Time Disbursement Reflection: Once an administrator approves a loan, the balance updates immediately without requiring a manual deposit, and a BANK_LOAN_DISBURSEMENT credit entry is posted to the transfer ledger.'));

  body.push(heading2('6.2. Admin Fraud Guard & Management Center'));
  body.push(bullet('Live Suspicious Transaction Stream: Real-time list of all flagged transfers with severity badges (CRITICAL, HIGH, MEDIUM), risk score meters, and specific rule violation reasons.'));
  body.push(bullet('Resolution Actions: Mark alerts as CLEARED, UNDER_INVESTIGATION, or CONFIRMED_FRAUD from the UI.'));
  body.push(bullet('Loan Approval Workflow: Review pending applications and click "Approve & Disburse" or "Reject" — approval instantly credits the customer account.'));
  body.push(bullet('Live Aggregation Dashboards: Real-time tables detailing account distribution by type and loan exposure by status.'));
  body.push(bullet('Security Audit Trail: Live table of customer login successes and failures with IP tracking and TTL expiration countdowns.'));
  body.push(hrLine());
  body.push(emptyLine());

  // 7. Security
  body.push(heading1('7. Security Architecture & RBAC'));
  body.push(bullet('Password Security: Salted hashes via bcryptjs with 10 salt rounds. Plaintext credentials never touch memory or logs.'));
  body.push(bullet('Stateless JWT Authentication: Payload includes { id, email, role, name }. Signed using HMAC SHA-256 with a 24-hour expiration window.'));
  body.push(bullet('Role-Based Access Control (RBAC): verifyToken middleware guarantees caller holds a valid cryptographic signature. requireAdmin rejects non-administrative users attempting to query fraud feeds, execute loan decisions, or inspect security logs with 403 Forbidden.'));
  body.push(hrLine());
  body.push(emptyLine());

  // 8. API Spec
  body.push(heading1('8. Complete API Endpoint Specification'));
  body.push(normal('All endpoints communicate via JSON over http://localhost:5000/api'));
  body.push(emptyLine());
  body.push(table(
    ['Method', 'Endpoint', 'Access', 'Description'],
    [
      ['POST', '/api/customers/register', 'Public', 'Register customer (name, email, password, phone, role)'],
      ['POST', '/api/customers/login', 'Public', 'Authenticate and receive signed JWT token'],
      ['GET', '/api/customers/all', 'Admin', 'Retrieve all registered customer profiles'],
      ['GET', '/api/customers/security-logs', 'Admin', 'TTL-backed login audit records'],
      ['POST', '/api/accounts/create', 'Auth', 'Create new account with schema enum validation'],
      ['POST', '/api/accounts/deposit', 'Auth', 'Top-up balance for testing'],
      ['GET', '/api/accounts/customer/:customerId', 'Auth', 'Fetch all bank accounts for a user'],
      ['GET', '/api/accounts/details/:accNumber', 'Auth', 'Lookup account by account number'],
      ['GET', '/api/accounts/report', 'Auth', 'Aggregation — accounts grouped by type'],
      ['POST', '/api/transfers/transfer', 'Auth', 'Execute atomic fund transfer & trigger fraud engine'],
      ['GET', '/api/transfers/history/:accNumber', 'Auth', 'Indexed transfer statement history'],
      ['GET', '/api/transfers/analytics/spending', 'Auth', 'Aggregation — spending volume per account'],
      ['POST', '/api/beneficiaries/add', 'Auth', 'Add pre-registered trusted payee'],
      ['GET', '/api/beneficiaries/customer/:id', 'Auth', 'List saved beneficiaries for user'],
      ['POST', '/api/loans/apply', 'Auth', 'Submit loan application (default status: Pending)'],
      ['GET', '/api/loans/customer/:customerId', 'Auth', 'List user loan applications'],
      ['GET', '/api/loans/all', 'Admin', 'List all loan applications across customers'],
      ['GET', '/api/loans/stats', 'Auth', 'Aggregation — loan portfolio by status'],
      ['PATCH', '/api/loans/:id/status', 'Admin', 'Approve & Disburse or Reject a loan'],
      ['GET', '/api/fraud-alerts', 'Admin', 'List flagged suspicious transfers'],
      ['GET', '/api/fraud-alerts/stats', 'Admin', 'Aggregation — fraud metrics by severity'],
      ['PATCH', '/api/fraud-alerts/:id/status', 'Admin', 'Update incident resolution status'],
      ['GET', '/api/notifications', 'Auth', 'Fetch active unexpired TTL notifications'],
    ]
  ));
  body.push(hrLine());
  body.push(emptyLine());

  // 9. Execution
  body.push(heading1('9. Verification & Execution Instructions'));
  body.push(heading2('Starting the Application'));
  body.push(normal('Step 1: Navigate to the backend directory:'));
  body.push(codePara('cd "d:\\Database Smart banking Detection System\\backend"'));
  body.push(normal('Step 2: Start the integrated server:'));
  body.push(codePara('node server.js'));
  body.push(normal('Step 3: Open your browser and navigate to:'));
  body.push(codePara('http://localhost:5000'));
  body.push(emptyLine());

  body.push(heading2('Running Automated Verification Scripts'));
  body.push(table(
    ['Script', 'Command', 'What It Demonstrates'],
    [
      ['Index Benchmark', 'npm run benchmark', 'COLLSCAN vs IXSCAN query plans with document examination counts.'],
      ['DB Schema Validation', 'npm run setup-db', 'Applies MongoDB Atlas collection-level $jsonSchema validators.'],
      ['Fraud Simulation', 'npm run simulate', 'Creates live test transfers and verifies Change Stream alert generation.'],
    ]
  ));
  body.push(hrLine());
  body.push(emptyLine());

  // 10. Conclusion
  body.push(heading1('10. Conclusion'));
  body.push(normal('The Smart Digital Banking System with Real-Time Fraud Detection fulfills all commitments established in Reviews 1 and 2. This project demonstrates a robust, modern, production-ready implementation of database management systems principles:'));
  body.push(emptyLine());
  body.push(bullet('MongoDB Change Streams — Replaces polling with sub-second fraud detection directly from the database oplog.'));
  body.push(bullet('Multi-Document ACID Transactions — Guarantees zero balance discrepancy across all fund transfer operations.'));
  body.push(bullet('Compound Indexing — Proves query optimization through explain() performance benchmarking.'));
  body.push(bullet('$jsonSchema Validation — Protects database integrity at the storage engine level.'));
  body.push(bullet('TTL Indexes — Eliminates maintenance overhead with automated data expiry.'));
  body.push(bullet('Aggregation Pipelines — Delivers complex financial intelligence computed natively in MongoDB.'));
  body.push(bullet('Replica Set & Sharding — Provides enterprise-grade high availability and horizontal scalability.'));
  body.push(bullet('React Frontend UI — Complete end-to-end user and administrator workflows in a polished interface.'));
  body.push(emptyLine());
  body.push(normal('All features are fully implemented, tested, and running live on the application server.'));

  const bodyXml = body.join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// ─── Styles XML ───────────────────────────────────────────────────────────────
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="160"/></w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/><w:szCs w:val="22"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="80"/></w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/>
      <w:b/><w:sz w:val="52"/><w:szCs w:val="52"/>
      <w:color w:val="1F3864"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="240"/></w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/>
      <w:sz w:val="36"/><w:szCs w:val="36"/>
      <w:color w:val="2E75B6"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:numPr/>
      <w:spacing w:before="480" w:after="160"/>
      <w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="2E75B6"/></w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/>
      <w:b/><w:sz w:val="32"/><w:szCs w:val="32"/>
      <w:color w:val="2E75B6"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="320" w:after="120"/></w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/>
      <w:b/><w:sz w:val="26"/><w:szCs w:val="26"/>
      <w:color w:val="2E75B6"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/><w:i/><w:sz w:val="22"/><w:szCs w:val="22"/>
      <w:color w:val="1F497D"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:after="80"/>
      <w:ind w:left="720" w:hanging="360"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="CodeBlock">
    <w:name w:val="Code Block"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:before="0" w:after="0"/>
      <w:ind w:left="720"/>
      <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>
      <w:sz w:val="18"/><w:szCs w:val="18"/>
      <w:color w:val="C0392B"/>
    </w:rPr>
  </w:style>

  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="4472C4"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="4472C4"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="4472C4"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="4472C4"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="4472C4"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="4472C4"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tcPr>
      <w:tcMar>
        <w:top w:w="80" w:type="dxa"/>
        <w:left w:w="108" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/>
        <w:right w:w="108" w:type="dxa"/>
      </w:tcMar>
    </w:tcPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="20"/>
    </w:rPr>
  </w:style>
</w:styles>`;

// ─── Other required XML parts ─────────────────────────────────────────────────
const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const WORD_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('📄 Generating FINAL_PROJECT_REPORT_REVIEW_3.docx ...');

  const documentXml = buildDocumentXml();

  const files = [
    { name: '[Content_Types].xml',        data: Buffer.from(CONTENT_TYPES_XML, 'utf8') },
    { name: '_rels/.rels',                data: Buffer.from(RELS_XML, 'utf8') },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(WORD_RELS_XML, 'utf8') },
    { name: 'word/document.xml',          data: Buffer.from(documentXml, 'utf8') },
    { name: 'word/styles.xml',            data: Buffer.from(STYLES_XML, 'utf8') },
  ];

  const zipBuffer = buildZip(files);
  const outPath = path.join(__dirname, '..', '..', 'FINAL_PROJECT_REPORT_REVIEW_3.docx');
  fs.writeFileSync(outPath, zipBuffer);

  const sizeKB = (zipBuffer.length / 1024).toFixed(1);
  console.log(`✅ Done! File written to: ${outPath}`);
  console.log(`   Size: ${sizeKB} KB`);
  console.log(`   Open it in Microsoft Word now.`);
}

main();
