const mongoose = require("mongoose");
require("dotenv").config(); 

const connection_string = process.env.MONGODB_CONNECTION_STRING;

const connect_to_mongodb = () => {
    try {
        mongoose.connect(connection_string);
        console.log("MongoDB connected successfully!");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
};

module.exports = connect_to_mongodb;
