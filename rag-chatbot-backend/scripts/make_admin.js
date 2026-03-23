require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

const email = process.argv[2];

if (!email) {
  console.error("Please provide an email address: node make_admin.js user@example.com");
  process.exit(1);
}

const promoteToAdmin = async () => {
  try {
    await connectDB();
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }
    
    user.role = "admin";
    await user.save();
    
    console.log(`Successfully promoted ${email} to admin!`);
    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

promoteToAdmin();
