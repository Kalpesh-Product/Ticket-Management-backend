// Import mongoose
const mongoose = require("mongoose");

// Function to connect server to mongoDB Database
async function connectToDb() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("connected to mongo DB");
  } catch (error) {
    console.log(error);
  }
}

module.exports = connectToDb;
