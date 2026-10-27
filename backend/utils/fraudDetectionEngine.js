const Transfer = require("../models/Transfer");
const Account = require("../models/Account");
const Beneficiary = require("../models/Beneficiary");
const FraudAlert = require("../models/FraudAlert");
const Notification = require("../models/Notification");

/**
 * Real-Time Fraud Detection Engine
 * Evaluates freshly inserted transactions through multi-factor risk heuristics
 */
async function evaluateTransfer(transferDoc) {
    try {
        const { _id, fromAccount, toAccount, amount, transferredAt } = transferDoc;
        const txAmount = Number(amount);
        const rulesTriggered = [];
        let riskScore = 0;

        // -------------------------------------------------------------
        // RULE 1: Transaction Amount Thresholds
        // Designed for both real-world (>₹50k) and demo (>₹3,000 on ₹5k opening balance)
        // -------------------------------------------------------------
        if (txAmount >= 50000) {
            rulesTriggered.push({
                ruleCode: "CRITICAL_AMOUNT_THRESHOLD",
                description: `Extreme transfer amount ₹${txAmount.toLocaleString()} exceeds critical ₹50,000 threshold`,
                weight: 55
            });
            riskScore += 55;
        } else if (txAmount >= 3000) {
            rulesTriggered.push({
                ruleCode: "HIGH_AMOUNT_THRESHOLD",
                description: `High transfer amount ₹${txAmount.toLocaleString()} exceeds standard ₹3,000 threshold (>50% of typical balance)`,
                weight: 40
            });
            riskScore += 40;
        }

        // -------------------------------------------------------------
        // RULE 2: Velocity Check (Rapid repeated transfers)
        // Uses compound index { fromAccount: 1, transferredAt: -1 }
        // -------------------------------------------------------------
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentTransferCount = await Transfer.countDocuments({
            fromAccount: fromAccount,
            transferredAt: { $gte: fiveMinutesAgo }
        });

        // If 2 or more transfers happened within 5 minutes
        if (recentTransferCount >= 2) {
            rulesTriggered.push({
                ruleCode: "RAPID_VELOCITY",
                description: `High velocity activity: ${recentTransferCount} transfers initiated within a 5-minute window`,
                weight: 40
            });
            riskScore += 40;
        }

        // -------------------------------------------------------------
        // RULE 3: Non-Beneficiary Payee Check
        // Checks if the destination account is pre-registered by the sender
        // -------------------------------------------------------------
        const senderAccount = await Account.findOne({ accountNumber: fromAccount });
        if (senderAccount && senderAccount.customerId) {
            const isRegisteredBeneficiary = await Beneficiary.findOne({
                customerId: senderAccount.customerId,
                accountNumber: toAccount
            });

            if (!isRegisteredBeneficiary) {
                rulesTriggered.push({
                    ruleCode: "NON_BENEFICIARY_PAYEE",
                    description: `Transferred funds to recipient [${toAccount}] who is NOT in saved beneficiaries`,
                    weight: 35
                });
                riskScore += 35;
            }
        } else {
            // Unregistered sender or external recipient
            rulesTriggered.push({
                ruleCode: "UNVERIFIED_ACCOUNT_TRANSFER",
                description: `Transfer involves unverified recipient account [${toAccount}]`,
                weight: 30
            });
            riskScore += 30;
        }

        // Cap risk score between 0 and 100
        riskScore = Math.min(riskScore, 100);

        // Determine severity
        let severity = "LOW";
        if (riskScore >= 70) {
            severity = "CRITICAL";
        } else if (riskScore >= 50) {
            severity = "HIGH";
        } else if (riskScore >= 30) {
            severity = "MEDIUM";
        }

        // Flag if risk score reaches threshold (>= 30)
        if (riskScore >= 30) {
            const fraudAlert = new FraudAlert({
                transferId: _id,
                fromAccount,
                toAccount,
                amount: txAmount,
                riskScore,
                severity,
                rulesTriggered,
                status: "FLAGGED",
                detectedAt: new Date()
            });

            await fraudAlert.save();

            // Insert TTL-backed Notification for live display
            await Notification.create({
                message: `⚠️ [FRAUD ALERT - ${severity}] Suspicious transfer of ₹${txAmount.toLocaleString()} from ${fromAccount} to ${toAccount}. Risk Score: ${riskScore}%.`,
                type: "FRAUD_WARNING",
                metadata: {
                    alertId: fraudAlert._id,
                    fromAccount,
                    toAccount,
                    amount: txAmount,
                    riskScore,
                    severity
                }
            });

            // Terminal Log for Review 3 Live Demo
            console.log("\n==================================================");
            console.log(`🚨 REAL-TIME FRAUD DETECTED (Change Stream Triggered)`);
            console.log(`Severity: [${severity}] | Risk Score: ${riskScore}%`);
            console.log(`Transfer: From ${fromAccount} -> To ${toAccount} | Amount: ₹${txAmount}`);
            console.log("Violations:");
            rulesTriggered.forEach((r, idx) => {
                console.log(`  ${idx + 1}. [${r.ruleCode}] ${r.description}`);
            });
            console.log("Status: Logged to FraudAlert collection & TTL Notification pushed");
            console.log("==================================================\n");

            return { flagged: true, fraudAlert };
        }

        console.log(`[Real-Time Monitor] Transfer ${fromAccount} -> ${toAccount} (₹${txAmount}) passed risk checks (Score: ${riskScore}%).`);
        return { flagged: false, riskScore };

    } catch (error) {
        console.error("Error in Real-Time Fraud Evaluation:", error.message);
    }
}

module.exports = {
    evaluateTransfer
};
