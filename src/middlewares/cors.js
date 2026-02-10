const cors = require("cors");
const config = require("../config");
const getHostname = require("../utils/getHostname");

const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (config.cors.allowedOrigins.has(getHostname(origin.toLowerCase())))
      return cb(null, true);

    cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

module.exports = corsMiddleware;
