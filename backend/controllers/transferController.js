const mongoose = require("mongoose");

const Account =
require("../models/Account");

const Transfer =
require("../models/Transfer");

exports.transferFunds =
async(req,res)=>{

const session =
await mongoose.startSession();

session.startTransaction();

try{

const {
fromAccount,
toAccount,
amount
} = req.body;

const sender =
await Account.findOne(
{accountNumber:fromAccount}
).session(session);

const receiver =
await Account.findOne(
{accountNumber:toAccount}
).session(session);

if(sender.balance < amount){

throw new Error(
"Insufficient Balance"
);

}

sender.balance -= amount;
receiver.balance += amount;

await sender.save({session});
await receiver.save({session});

await Transfer.create(
[{
fromAccount,
toAccount,
amount
}],
{session}
);

await session.commitTransaction();

res.json({
message:
"Transfer Successful"
});

}
catch(err){

await session.abortTransaction();

res.status(500).json({
error:err.message
});

}
finally{

session.endSession();

}

};
