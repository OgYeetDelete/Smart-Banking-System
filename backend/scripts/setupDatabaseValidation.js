require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");

/**
 * Applies MongoDB Collection-Level $jsonSchema Validation Rules
 * Directly enforces database-engine integrity constraints regardless of client or application.
 */
async function setupDatabaseValidation() {
    try {
        console.log("==================================================");
        console.log("Configuring Database-Level $jsonSchema Validation");
        console.log("==================================================");

        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        console.log("Connected to MongoDB Atlas.");

        // 1. Enforce validation on 'accounts' collection
        console.log("\n1. Applying schema validator on 'accounts' collection...");
        try {
            await db.command({
                collMod: "accounts",
                validator: {
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["customerId", "accountNumber", "accountType", "balance"],
                        properties: {
                            customerId: {
                                bsonType: "objectId",
                                description: "Must be a valid ObjectId reference to customer"
                            },
                            accountNumber: {
                                bsonType: "string",
                                description: "Must be a unique string"
                            },
                            accountType: {
                                enum: ["Savings", "Current", "Salary"],
                                description: "Can only be Savings, Current, or Salary"
                            },
                            balance: {
                                bsonType: "number",
                                minimum: 0,
                                description: "Account balance cannot fall below 0"
                            }
                        }
                    }
                },
                validationLevel: "moderate",
                validationAction: "error"
            });
            console.log("✔ 'accounts' schema validation applied (balance >= 0 enforced at DB level).");
        } catch (err) {
            console.warn("Notice on 'accounts' validator:", err.message);
        }

        // 2. Enforce validation on 'transfers' collection
        console.log("\n2. Applying schema validator on 'transfers' collection...");
        try {
            await db.command({
                collMod: "transfers",
                validator: {
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["fromAccount", "toAccount", "amount", "transferredAt"],
                        properties: {
                            fromAccount: {
                                bsonType: "string",
                                description: "Sender account number is required"
                            },
                            toAccount: {
                                bsonType: "string",
                                description: "Receiver account number is required"
                            },
                            amount: {
                                bsonType: "number",
                                minimum: 1,
                                description: "Transfer amount must be at least ₹1"
                            },
                            transferredAt: {
                                bsonType: "date",
                                description: "Must be a valid timestamp"
                            }
                        }
                    }
                },
                validationLevel: "moderate",
                validationAction: "error"
            });
            console.log("✔ 'transfers' schema validation applied (amount >= 1 enforced at DB level).");
        } catch (err) {
            console.warn("Notice on 'transfers' validator:", err.message);
        }

        // 3. Enforce Compound Index on transfers
        console.log("\n3. Enforcing Compound Index on 'transfers' collection...");
        await db.collection("transfers").createIndex(
            { fromAccount: 1, transferredAt: -1 },
            { name: "fromAccount_1_transferredAt_-1", background: true }
        );
        console.log("✔ Compound index { fromAccount: 1, transferredAt: -1 } verified.");

        console.log("\n==================================================");
        console.log("Database-Level Schema Validation Setup Complete!");
        console.log("==================================================");

    } catch (err) {
        console.error("Setup validation error:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

setupDatabaseValidation();
