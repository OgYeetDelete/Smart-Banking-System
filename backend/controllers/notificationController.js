const Notification =
require("../models/Notification");

exports.createNotification =
async (req,res)=>{

    try{

        const notification =
        new Notification({

            message:
            req.body.message

        });

        await notification.save();

        res.status(201).json({
            message:
            "Notification Created",
            notification
        });

    }
    catch(err){

        res.status(500).json({
            error: err.message
        });

    }

};