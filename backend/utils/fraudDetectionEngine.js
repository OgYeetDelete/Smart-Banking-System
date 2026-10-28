const Transfer = require("../models/Transfer");
const FraudAlert = require("../models/FraudAlert");
const Beneficiary = require("../models/Beneficiary");
const Account = require("../models/Account");
const Notification = require("../models/Notification");

/**
 * Heuristic Fraud Detection Engine
 * Called by Change Stream watcher on every new transfer.
 * 3 Rules:
 *   1. Amount Threshold:  ≥₹3,000 → +40 risk | ≥₹50,000 → +55 risk
 *   2. Velocity Check:    ≥2 transfers from same account in 5 min → +40 risk
 *   3. Non-Beneficiary:   Payee not in sender's beneficiary list → +35 risk
 */
async function evaluateTransfer(transfer) {
  let riskScore = 0;
  const rulesTriggered = [];

  // Rule 1: Amount threshold
  if (transfer.amount >= 50000) {
    riskScore += 55;
    rulesTriggered.push("HIGH_AMOUNT_50K");
  } else if (transfer.amount >= 3000) {
    riskScore += 40;
    rulesTriggered.push("AMOUNT_THRESHOLD_3K");
  }

  // Rule 2: Velocity check — ≥2 transfers from same account in last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentCount = await Transfer.countDocuments({
    fromAccount: transfer.fromAccount,
    transferredAt: { $gte: fiveMinAgo }
  });
  if (recentCount >= 2) {
    riskScore += 40;
    rulesTriggered.push("VELOCITY_CHECK");
  }

  // Rule 3: Non-beneficiary payee
  const senderAccount = await Account.findOne({ accountNumber: transfer.fromAccount });
  if (senderAccount) {
    const isBeneficiary = await Beneficiary.findOne({
      customerId: senderAccount.customerId,
      accountNumber: transfer.toAccount
    });
    if (!isBeneficiary) {
      riskScore += 35;
      rulesTriggered.push("NON_BENEFICIARY_PAYEE");
    }
  }

  // If risk score ≥ 30, create a fraud alert
  if (riskScore >= 30) {
    let severity;
    if (riskScore >= 90) severity = "CRITICAL";
    else if (riskScore >= 70) severity = "HIGH";
    else if (riskScore >= 50) severity = "MEDIUM";
    else severity = "LOW";

    await FraudAlert.create({
      transferId: transfer._id,
      fromAccount: transfer.fromAccount,
      toAccount: transfer.toAccount,
      amount: transfer.amount,
      riskScore,
      severity,
      rulesTriggered
    });

    // TTL notification — auto-expires in 5 min
    await Notification.create({
      message: `🚨 Fraud Alert (${severity}): ₹${transfer.amount.toLocaleString()} from ${transfer.fromAccount} → ${transfer.toAccount} | Score: ${riskScore} | Rules: ${rulesTriggered.join(", ")}`,
      type: "FRAUD_WARNING",
      metadata: { riskScore, severity, fromAccount: transfer.fromAccount }
    });

    console.log(`[FRAUD ENGINE] Alert created — Score: ${riskScore} | Severity: ${severity} | Rules: ${rulesTriggered.join(", ")}`);
  }
}

module.exports = { evaluateTransfer };
