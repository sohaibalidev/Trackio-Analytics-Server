require("dotenv").config();

const app = require("./src/app");
const config = require("./src/config");
const connectDB = require("./src/config/database");
const routes = require("./src/routes/index.routes");

connectDB();

app.use(routes);

let server;
(async () => {
  try {
    await config.initCors();

    server = app.listen(config.port, () => {
      console.log(`[SERVER] Running at ${config.apiUrl}`);
      console.log(`[SERVER] Client URL ${config.frontendUrl}`);
    });
  } catch (err) {
    console.error("[SERVER] Failed to start:", err.message);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (err) => {
  console.error("[SERVER] Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("[SERVER] Uncaught Exception:", err.message);
  process.exit(1);
});
