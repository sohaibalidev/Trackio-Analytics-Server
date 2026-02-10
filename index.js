require("dotenv").config();

const app = require("./src/app");
const config = require("./src/config");
const connectDB = require("./src/config/database");
const routes = require("./src/routes/index.routes");

const PORT = config.port || 5000;

connectDB();

app.use(routes);

const server = app.listen(PORT, () => {
  console.log(`[SERVER] Running at ${config.apiUrl}`);
  console.log(`[SERVER] Client URL ${config.frontendUrl}`);
});

process.on("unhandledRejection", (err) => {
  console.error("[SERVER] Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("[SERVER] Uncaught Exception:", err.message);
  process.exit(1);
});
