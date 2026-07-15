const mongoose = require("mongoose");
const config = require(".");

const connectDB = async () => {
  try {
    await mongoose.connect(config.database.uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
    });
    console.log(`[MONGO] Connection Established`);
  } catch (error) {
    console.error(`[MONGO] Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
