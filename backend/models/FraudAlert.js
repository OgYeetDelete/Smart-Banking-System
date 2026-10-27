const mongoose = require("mongoose");

const fraudAlertSchema = new mongoose.Schema({
    transferId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transfer"
    },
    fromAccount: {
        type: String,
        required: true,
        index: true
    },
    toAccount: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    riskScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    severity: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        default: "MEDIUM",
        index: true
    },
    rulesTriggered: [{
        ruleCode: String,
        description: String,
        weight: Number
    }],
    status: {
        type: String,
        enum: ["FLAGGED", "UNDER_INVESTIGATION", "CLEARED", "CONFIRMED_FRAUD"],
        default: "FLAGGED",
        index: true
    },
    detectedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for querying alerts by status and date
fraudAlertSchema.index({ status: 1, detectedAt: -1 });

module.exports = mongoose.model("FraudAlert", fraudAlertSchema);
