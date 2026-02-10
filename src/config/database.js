const mongoose = require("mongoose");
const config = require(".");

const connectDB = async () => {
  try {
    await mongoose.connect(config.database.uri);
    console.log(`[MONGO] Connection Established`);
  } catch (error) {
    console.error(`[MONGO] Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
