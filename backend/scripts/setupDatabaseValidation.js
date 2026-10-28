/**
 * $jsonSchema Database-Level Validation
 * Applies MongoDB schema validators via collMod command.
 * Run: node scripts/setupDatabaseValidation.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

async function setup() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();

  console.log("Applying $jsonSchema validators...\n");

  // Validate Customers
  await db.command({
    collMod: "customers",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { bsonType: "string", description: "must be a string and is required" },
          email: { bsonType: "string", pattern: "^.+@.+\\..+$", description: "must be a valid email" },
          password: { bsonType: "string", minLength: 6, description: "must be at least 6 characters" },
          role: { enum: ["customer", "admin"], description: "must be customer or admin" }
        }
      }
    },
    validationLevel: "moderate"
  });
  console.log("✓ customers collection validator applied");

  // Validate Accounts
  await db.command({
    collMod: "accounts",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["customerId", "accountNumber", "accountType"],
        properties: {
          accountType: { enum: ["Savings", "Current", "Salary"], description: "must be Savings, Current, or Salary" },
          balance: { bsonType: "number", minimum: 0, description: "balance cannot be negative" },
          isFrozen: { bsonType: "bool", description: "must be a boolean" }
        }
      }
    },
    validationLevel: "moderate"
  });
  console.log("✓ accounts collection validator applied (includes isFrozen)");

  // Validate Transfers
  await db.command({
    collMod: "transfers",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["fromAccount", "toAccount", "amount"],
        properties: {
          amount: { bsonType: "number", minimum: 1, description: "transfer amount must be at least 1" }
        }
      }
    },
    validationLevel: "moderate"
  });
  console.log("✓ transfers collection validator applied");

  // Validate Fixed Deposits
  await db.command({
    collMod: "fixeddeposits",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["customerId", "accountId", "principal", "interestRate", "tenureMonths"],
        properties: {
          principal: { bsonType: "number", minimum: 1000, description: "minimum FD is ₹1,000" },
          tenureMonths: { bsonType: "number", minimum: 1, description: "minimum tenure is 1 month" },
          status: { enum: ["Active", "Matured", "Withdrawn"], description: "must be a valid FD status" }
        }
      }
    },
    validationLevel: "moderate"
  });
  console.log("✓ fixeddeposits collection validator applied");

  console.log("\nAll $jsonSchema validators applied successfully!");
  await client.close();
  process.exit(0);
}

setup().catch(err => { console.error(err); process.exit(1); });
