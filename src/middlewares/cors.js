const cors = require("cors");
const config = require("../config");
const getHostname = require("../utils/getHostname");

const corsMiddleware = cors({
  origin: (origin, cb) => {
    console.log("========== CORS DEBUG ==========");
    console.log("Origin:", origin);

    if (!origin) {
      console.log("No origin, allowing");
      return cb(null, true);
    }

    const hostname = getHostname(origin.toLowerCase());
    console.log("Hostname:", hostname);
    console.log("Allowed origins:", Array.from(config.cors.allowedOrigins));

    if (config.cors.allowedOrigins.has(hostname)) {
      console.log("Origin allowed");
      return cb(null, true);
    }

    console.log("Origin blocked");
    cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

module.exports = corsMiddleware;
