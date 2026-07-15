require("dotenv").config();

const app = require("./src/app");
const http = require("http");
const socketio = require("./src/socket");
const config = require("./src/config");
const connectDB = require("./src/config/database");
const corsMiddleware = require("./src/middlewares/cors");

(async () => {
  try {
    await connectDB();
    await config.initCors();

    app.use(corsMiddleware);

    const server = http.createServer(app);
    const io = socketio(server);
    app.set("io", io);

    server.listen(config.port, () => {
      console.log(`[SERVER] Running at ${config.apiUrl}`);
      console.log(`[SERVER] Client URL ${config.frontendUrl}`);
      console.log(`[SERVER] Socket.IO enabled for live sessions`);
    });

    process.on("unhandledRejection", (err) => {
      console.error("[SERVER] Unhandled Rejection:", err.message);
      server.close(() => process.exit(1));
    });

    process.on("uncaughtException", (err) => {
      console.error("[SERVER] Uncaught Exception:", err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error("[SERVER] Failed to start:", err.message);
    process.exit(1);
  }
})();
