# Smart Digital Banking System with Real-Time Fraud Detection
## Comprehensive Final Project Report (Review 3)

**Academic Evaluation:** Database Management Systems Capstone Project  
**Authors:** Srijan Sengupta (24BCE2218) | Shubho Das (24BCE2276)  
**Date:** October 2026  
**Repository:** [OgYeetDelete/Smart-Banking-System](https://github.com/OgYeetDelete/Smart-Banking-System.git)

---

## 1. Executive Summary & Abstract

The **Smart Digital Banking System with Real-Time Fraud Detection** is a full-stack, enterprise-grade financial technology application designed to demonstrate advanced database engineering beyond basic CRUD operations. Built on Node.js, Express 5, React 18, and MongoDB Atlas, the system delivers atomic fund transfers, real-time transaction surveillance, automated risk scoring, multi-tier data lifecycle management, and complex financial reporting.

In conventional web architectures, fraud detection is performed using asynchronous batch analytics scheduled hours or days after transactions commit. This project demonstrates an **event-driven database pattern**: MongoDB Change Streams listen directly to the database replication log (oplog), evaluating every newly inserted transaction against multi-factor risk heuristics the millisecond it is committed, and writing live, time-bounded alerts to administrators without polling or blocking client transfers.

Financial integrity is enforced at the database layer using **Multi-Document ACID Transactions**, strict **`$jsonSchema` validation constraints** (guaranteeing non-negative balances), **compound B-tree indexes** validated through `explain("executionStats")` benchmarks, and **Time-To-Live (TTL) indexes** that self-purge temporary security alerts and application data.

---

## 2. System Architecture & Component Design

The application follows a decoupled three-tier architecture:

```
[ Frontend: React 18 SPA (Customer Portal & Admin Fraud Center) ]
                         │  ▲
                 REST / JSON API
                         ▼  │
[ Backend: Node.js & Express 5 (Controllers, Auth Middleware, Fraud Engine) ]
                         │  ▲
                 Mongoose Sessions & Oplog Push
                         ▼  │
[ Database: MongoDB Atlas 3-Node Replica Set (bankingDB Collections) ]
```

---

## 3. Technology Stack

| Tier | Technology | Version | Function in System |
| :--- | :--- | :--- | :--- |
| **Frontend** | React.js | 18.3.1 | Single-Page Application (SPA) providing Customer Banking Dashboard, Transfer Modals, and Admin Real-Time Threat Center. |
| **Backend** | Node.js | v24.x | Non-blocking, event-driven JavaScript server runtime. |
| **Web Framework**| Express.js | 5.2.1 | REST API routing, JSON body parsing, and SPA asset serving. |
| **ODM Library** | Mongoose | 9.10.2 | Schema modeling, relationship management, and change stream integration. |
| **Database** | MongoDB Atlas | Cluster0 | Cloud-hosted multi-node Replica Set supporting distributed transactions, oplog streams, and sharding. |
| **Security** | JSON Web Tokens | 9.0.3 | Stateless authentication with embedded user identity and RBAC role. |
| **Cryptography** | bcryptjs | 3.0.3 | 10-round salted one-way hashing for secure credential persistence. |

---

## 4. Comprehensive Database Schema & Collections

The database `bankingDB` comprises seven normalized, interconnected collections:

### 4.1. `customers`
Stores customer profile records and access credentials.
* **Fields:** `_id` (ObjectId), `name` (String), `email` (String, Unique Index), `password` (String, bcrypt salted hash), `phone` (String), `role` (Enum: `"customer"` | `"admin"`), `createdAt`, `updatedAt`.
* **Database Constraints:** Case-insensitive unique B-tree index on `email`. Passwords are never persisted in plaintext.

### 4.2. `accounts`
Represents customer bank accounts.
* **Fields:** `_id` (ObjectId), `customerId` (ObjectId ref: `Customer`), `accountNumber` (String, Unique Index), `accountType` (Enum: `"Savings"`, `"Current"`, `"Salary"`), `balance` (Number, >= 0).
* **Database Constraints:** 
  * Unique single-field index on `accountNumber`.
  * Collection-level `$jsonSchema` constraint: `balance: { minimum: 0 }`.

### 4.3. `transfers`
Audit ledger of completed balance transfers.
* **Fields:** `_id` (ObjectId), `fromAccount` (String), `toAccount` (String), `amount` (Number, >= 1), `transferredAt` (Date, default `Date.now`).
* **Database Constraints:**
  * **Compound Index:** `{ fromAccount: 1, transferredAt: -1 }`.
  * Multi-document ACID session write.

### 4.4. `beneficiaries`
Pre-registered recipient whitelist for customers.
* **Fields:** `_id` (ObjectId), `customerId` (ObjectId ref: `Customer`), `beneficiaryName` (String), `accountNumber` (String).
* **Design Rationale:** Decoupled into its own collection referenced by `customerId` to prevent unbounded array document growth (anti-pattern).

### 4.5. `loans`
Customer loan applications with automated disbursement workflow.
* **Fields:** `_id` (ObjectId), `customerId` (ObjectId ref: `Customer`), `loanType` (Enum: `"Education Loan"`, `"Personal Loan"`, `"Home Loan"`, `"Vehicle Loan"`, `"Business Loan"`), `amount` (Number), `status` (Enum: `"Pending"`, `"Approved"`, `"Rejected"`), `createdAt` (Date).
* **Database Constraints:**
  * **TTL Index:** `expires: 31536000` (1 Year auto-cleanup).
  * **Disbursement Hook:** Approving a loan atomically credits the borrower's bank account balance and writes a `"BANK_LOAN_DISBURSEMENT"` transfer record.

### 4.6. `fraudalerts`
Real-time incident repository for suspicious transactions flagged by the heuristic engine.
* **Fields:** `_id` (ObjectId), `transferId` (ObjectId ref: `Transfer`), `fromAccount` (String), `toAccount` (String), `amount` (Number), `riskScore` (Number, 0 to 100), `severity` (Enum: `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"CRITICAL"`), `rulesTriggered` (Array of sub-documents: `{ ruleCode, description, weight }`), `status` (Enum: `"FLAGGED"`, `"UNDER_INVESTIGATION"`, `"CLEARED"`, `"CONFIRMED_FRAUD"`), `detectedAt` (Date).
* **Index:** Compound index on `{ status: 1, detectedAt: -1 }`.

### 4.7. `notifications` & `securitylogs` (TTL Collections)
* **`notifications`:** Real-time push alerts with TTL `expires: 300` (5 minutes).
* **`securitylogs`:** Authentication audit trail (login attempts, IPs, statuses) with TTL `expires: 300` (5 minutes).

---

## 5. Advanced Database Engineering Techniques

### Pillar 1: Multi-Document ACID Transactions
In fund transfers, three database writes across multiple documents and collections must occur simultaneously:
1. Debit sender's account balance: `sender.balance -= amount`
2. Credit receiver's account balance: `receiver.balance += amount`
3. Write immutable ledger record into `transfers`: `Transfer.create([...], { session })`

All 3 writes commit atomically or abort cleanly using MongoDB multi-document sessions.

---

### Pillar 2: Real-Time Change Streams & Heuristic Fraud Engine
Rather than relying on resource-intensive batch queries, the application hooks directly into MongoDB Atlas's replication oplog stream via `Transfer.watch()`.

#### Multi-Factor Fraud Heuristics:
1. **Rule 1 (Amount Anomalies):**
   * >= ₹3,000 (Large transfer out of standard balance) -> **+40 points**
   * >= ₹50,000 (Critical transfer threshold) -> **+55 points**
2. **Rule 2 (Velocity Spike):**
   * Queries transfers from `fromAccount` within the past 5 minutes using the compound index.
   * >= 2 transfers in 5 minutes -> **+40 points**
3. **Rule 3 (Unregistered Payee):**
   * Checks if `toAccount` exists in the sender customer's registered `beneficiaries` list.
   * If recipient is unverified -> **+35 points**

#### Severity & Action Matrix:
* Risk Score >= 70%: **CRITICAL** (Logged to FraudAlert, pushed to TTL Notifications, terminal alert).
* Risk Score 50% - 69%: **HIGH** (Flagged for investigation).
* Risk Score 30% - 49%: **MEDIUM** (Emits security warning).

---

### Pillar 3: Compound Indexing & `explain()` Benchmark

Compound index on `transfers`: `{ fromAccount: 1, transferredAt: -1 }`.

#### Benchmark Comparison:

| Metric | Without Index (`COLLSCAN`) | With Compound Index (`IXSCAN`) | Improvement Factor |
| :--- | :---: | :---: | :---: |
| **Execution Plan Stage** | `COLLSCAN` (Full Table Scan) | `IXSCAN` (B-Tree Index Scan) | Optimal Query Path |
| **Documents Examined** | All documents in collection (N) | Matching documents only (k) | ~100x fewer docs |
| **Keys Examined** | 0 | k | Direct pointer jump |
| **Execution Latency** | High linear growth O(N) | Sub-millisecond (~0 ms, O(log N)) | Instantaneous |

---

### Pillar 4: Database-Level Schema Validation (`$jsonSchema`)
Applied directly via MongoDB Atlas `collMod` command:
* `accounts` collection: Enforces `balance >= 0` and validates `accountType` enums (`Savings`, `Current`, `Salary`).
* Invalid inputs (e.g. `accountType: "Laptop"` or negative balances) are rejected directly by the MongoDB storage engine.

---

### Pillar 5: Time-To-Live (TTL) Data Lifecycle Management
* **5-Minute Alerts (`notifications` & `securitylogs`):** Auto-purged after 300 seconds without cron jobs.
* **1-Year Loan Records (`loans`):** Auto-purged after 31,536,000 seconds (1 year).

---

### Pillar 6: Financial Analytics via Aggregation Pipelines
Computed entirely inside MongoDB Atlas:
1. **Account Portfolio Distribution:** Groups accounts by `accountType`, computing `totalAccounts`, `totalBalance`, and `averageBalance`.
2. **Loan Exposure Summary:** Groups loans by `status`, computing total capital allocated and applicant counts.
3. **Fraud Threat Concentration:** Groups alerts by `severity` and calculates aggregated volume at risk.

---

### Pillar 7: High Availability & Horizontal Scalability
* **Replica Set:** 3-node MongoDB Atlas distributed cluster (`atlas-dw03wn-shard-0`) ensuring sub-3-second primary-secondary automatic failover.
* **Sharding Key Design:** Partitioning the `transfers` collection with a hashed shard key `{ fromAccount: "hashed" }` prevents write hotspots in high-throughput enterprise deployments.

---

## 6. End-to-End User Experience & UI Capabilities

* **Customer Portal (`http://localhost:5000`):**
  * Displays real-time balances, accounts list, and indexed transaction statements.
  * Interactive modals for Fund Transfers, New Account Opening, Fund Deposits, Beneficiary Registration, and Loan Applications.
  * Automatic balance crediting upon loan approval.
* **Admin Fraud Center (`http://localhost:5000`):**
  * Live feed of flagged suspicious transactions with risk scores and violation rule breakdowns.
  * Incident resolution actions (`CLEARED`, `CONFIRMED_FRAUD`).
  * Loan Approval & Disbursement workflow (Approve or Reject with 1 click).
  * Real-time Aggregation tables and TTL Security logs.

---

## 7. Security Architecture & RBAC

* **Password Hashing:** 10-round salted bcrypt hashing.
* **Stateless Tokens:** HMAC SHA-256 signed JSON Web Tokens carrying customer ID and role.
* **Role-Based Access Control:** Strict middleware guards (`verifyToken`, `requireAdmin`) restricting administrative endpoints.

---

## 8. Automated Scripts Reference

```powershell
# Run integrated application:
node server.js

# Run explain() indexing benchmark:
npm run benchmark

# Configure database-level schema validations:
npm run setup-db

# Run automated fraud detection simulation:
npm run simulate
```

---

## 9. Conclusion

The **Smart Digital Banking System with Real-Time Fraud Detection** fulfills all academic criteria for the Final Review:
1. Replaces batch polling with real-time **MongoDB Change Streams**.
2. Guarantees consistency with **Multi-Document ACID Transactions**.
3. Proves index optimization with **`explain()` B-tree benchmarks**.
4. Enforces data integrity with storage-level **`$jsonSchema` validation**.
5. Manages data retention with **TTL indexes**.
6. Delivers a complete full-stack **React user experience**.
