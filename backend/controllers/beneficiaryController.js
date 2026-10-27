const Beneficiary =
require("../models/Beneficiary");

exports.addBeneficiary =
async(req,res)=>{

    try{

        const beneficiary =
            new Beneficiary(req.body);

        await beneficiary.save();

        res.status(201).json({
            message:
            "Beneficiary Added"
        });

    }
    catch(err){
        res.status(500).json({
            error:err.message
        });
    }

};
