const Loan =
require("../models/Loan");

exports.applyLoan =
async(req,res)=>{

try{

const loan =
new Loan(req.body);

await loan.save();

res.status(201).json({
message:
"Loan Applied"
});

}
catch(err){

res.status(500).json({
error:err.message
});

}

};

exports.loanStatistics =
async(req,res)=>{

try{

const stats =
await Loan.aggregate([

{
$group:{
_id:"$status",
totalAmount:{
$sum:"$amount"
},
count:{
$sum:1
}
}
}

]);

res.json(stats);

}
catch(err){

res.status(500).json({
error:err.message
});

}

};
