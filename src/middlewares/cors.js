const cors = require("cors");
const config = require("../config");
const getHostname = require("../utils/getHostname");

const corsMiddleware = cors({
  origin: (origin, cb) => {
    console.log("========== CORS DEBUG ==========");
    console.log("Request Origin:", origin);

    if (!origin) {
      return cb(null, true);
    }

    const hostname = getHostname(origin).toLowerCase();

    console.log("Allowed:", Array.from(config.cors.allowedOrigins));

    if (config.cors.allowedOrigins.has(hostname)) {
      console.log("CORS Allowed");
      return cb(null, true);
    }

    console.log("CORS Blocked:", hostname);

    return cb(null, false);
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

module.exports = corsMiddleware;
