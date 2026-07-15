const mongoose = require("mongoose");
const config = require("./app.config");

let isConnected = false;
let connectionPromise = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

exports.connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once("connected", () => resolve(mongoose.connection));
      mongoose.connection.once("error", reject);
    });
  }

  connectionPromise = (async () => {
    try {
      await mongoose.connect(config.MONGODB_URI, {
        dbName: config.DB_NAME,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 1,
      });

      isConnected = true;
      reconnectAttempts = 0;

      mongoose.connection.on("error", (err) => {
        console.error("[MONGO] Connection error:", err);
        isConnected = false;
        connectionPromise = null;
      });

      mongoose.connection.on("disconnected", () => {
        console.log("[MONGO] Disconnected");
        isConnected = false;
        connectionPromise = null;
      });

      mongoose.connection.on("reconnected", () => {
        isConnected = true;
      });

      return mongoose.connection;
    } catch (err) {
      connectionPromise = null;
      isConnected = false;

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * reconnectAttempts),
        );
        return exports.connectDB();
      }

      console.error("[MONGO] Connection error:", err.message);
      throw err;
    }
  })();

  return connectionPromise;
};

exports.getConnection = async () => {
  if (!isConnected || mongoose.connection.readyState !== 1) {
    await exports.connectDB();
  }
  return mongoose.connection;
};

exports.closeConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    isConnected = false;
    connectionPromise = null;
  }
};
