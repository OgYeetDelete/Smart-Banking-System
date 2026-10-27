const Customer = require("../models/Customer");

console.log("Change Stream Started");

// Watch Customer collection
const stream = Customer.watch();

stream.on("change", (change) => {

    console.log("=================================");
    console.log("Customer Collection Changed");
    console.log("Operation:", change.operationType);
    console.log(change);
    console.log("=================================");

});

module.exports = stream;