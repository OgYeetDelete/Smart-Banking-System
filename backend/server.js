const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const notificationRoutes =require("./routes/notificationRoutes");
const customerRoutes = require("./routes/customerRoutes");
const accountRoutes = require("./routes/accountRoutes");
const beneficiaryRoutes = require("./routes/beneficiaryRoutes");
const transferRoutes = require("./routes/transferRoutes");
const loanRoutes = require("./routes/loanRoutes");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => {

    console.log("MongoDB Connected");

    // Start Change Stream
    require("./utils/changeStream");

})
.catch((err) => {

    console.log(err);

});

app.get("/", (req, res) => {
    res.send("Banking API Running");
});

// Customer APIs
app.use(
    "/api/customers",
    customerRoutes
);

// Account APIs
app.use(
    "/api/accounts",
    accountRoutes
);

// Beneficiary APIs
app.use(
    "/api/beneficiaries",
    beneficiaryRoutes
);

// Transfer APIs
app.use(
    "/api/transfers",
    transferRoutes
);

// Loan APIs
app.use(
    "/api/loans",
    loanRoutes
);

app.use(
    "/api/notifications",
    notificationRoutes
);

const PORT = 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});
