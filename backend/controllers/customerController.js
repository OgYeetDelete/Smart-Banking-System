const Customer = require("../models/Customer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.registerCustomer = async (req,res) => {

    try {

        const {
            name,
            email,
            password,
            phone
        } = req.body;

        const existing =
            await Customer.findOne({ email });

        if(existing){
            return res.status(400).json({
                message:"Email already exists"
            });
        }

        const hashedPassword =
            await bcrypt.hash(password,10);

        const customer =
            new Customer({
                name,
                email,
                password: hashedPassword,
                phone
            });

        await customer.save();

        res.status(201).json({
            message:
            "Customer Registered Successfully"
        });

    }
    catch(err){
        res.status(500).json({
            error: err.message
        });
    }

};

exports.loginCustomer = async (req,res) => {

    try {

        const { email,password } =
            req.body;

        const customer =
            await Customer.findOne({ email });

        if(!customer){
            return res.status(404).json({
                message:"Customer Not Found"
            });
        }

        const match =
            await bcrypt.compare(
                password,
                customer.password
            );

        if(!match){
            return res.status(400).json({
                message:"Invalid Password"
            });
        }

        const token =
            jwt.sign(
                { id: customer._id },
                "banksecret",
                { expiresIn:"1d" }
            );

        res.status(200).json({
            message:"Login Successful",
            token
        });

    }
    catch(err){
        res.status(500).json({
            error: err.message
        });
    }

};
