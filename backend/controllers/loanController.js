const Loan = require("../models/Loan");
const Account = require("../models/Account");
const Transfer = require("../models/Transfer");
const Notification = require("../models/Notification");

exports.applyLoan = async (req, res) => {
    try {
        const { customerId, loanType, amount } = req.body;

        const loan = new Loan({
            customerId,
            loanType,
            amount: Number(amount),
            status: "Pending"
        });

        await loan.save();

        res.status(201).json({
            message: "Loan Applied Successfully",
            loan
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.loanStatistics = async (req, res) => {
    try {
        const stats = await Loan.aggregate([
            {
                $group: {
                    _id: "$status",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCustomerLoans = async (req, res) => {
    try {
        const { customerId } = req.params;
        const loans = await Loan.find({ customerId }).sort({ createdAt: -1 });
        res.status(200).json(loans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllLoans = async (req, res) => {
    try {
        const loans = await Loan.find().populate("customerId", "name email phone").sort({ createdAt: -1 });
        res.status(200).json(loans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve or Reject Loan
 * When approved, loan amount is immediately credited to the customer's account balance,
 * logged into the Transfer ledger, and broadcasted via live notification.
 */
exports.updateLoanStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "Approved" or "Rejected"

        const loan = await Loan.findById(id);

        if (!loan) {
            return res.status(404).json({ message: "Loan application not found" });
        }

        if (loan.status === "Approved") {
            return res.status(400).json({ message: "Loan has already been approved and credited." });
        }

        loan.status = status;
        await loan.save();

        let creditedAccount = null;

        // Auto-disburse funds into customer's bank account upon approval
        if (status === "Approved") {
            const account = await Account.findOne({ customerId: loan.customerId });

            if (account) {
                account.balance += Number(loan.amount);
                await account.save();
                creditedAccount = account;

                // Record official loan disbursement ledger entry
                await Transfer.create({
                    fromAccount: "BANK_LOAN_DISBURSEMENT",
                    toAccount: account.accountNumber,
                    amount: Number(loan.amount),
                    transferredAt: new Date()
                });

                // Push celebratory live TTL notification
                await Notification.create({
                    message: `🎉 [LOAN APPROVED & CREDITED] Your ${loan.loanType} of ₹${Number(loan.amount).toLocaleString()} has been approved and credited to Account #${account.accountNumber}!`,
                    type: "TRANSACTION",
                    metadata: {
                        loanId: loan._id,
                        accountNumber: account.accountNumber,
                        amount: loan.amount
                    }
                });

                console.log(`\n==================================================`);
                console.log(`🏦 LOAN DISBURSED: ₹${loan.amount.toLocaleString()} credited to Account ${account.accountNumber}`);
                console.log(`New Account Balance: ₹${account.balance.toLocaleString()}`);
                console.log(`==================================================\n`);
            }
        }

        res.status(200).json({
            message: `Loan application marked as ${status}${creditedAccount ? ` and ₹${loan.amount.toLocaleString()} disbursed to Account #${creditedAccount.accountNumber}!` : ""}`,
            loan,
            newBalance: creditedAccount?.balance
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
