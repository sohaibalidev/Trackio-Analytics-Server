const cors = require("cors");
const { Website } = require("../models");
const getHostname = require("../utils/getHostname");
const config = require("../config");

const allowedDomains = new Set();

const corsMiddleware = (req, res, next) => {
  cors({
    origin: async (origin, cb) => {
      if (!origin) return cb(null, true);

      const requestHost = getHostname(origin);

      if (
        config.cors.allowedOrigins
          .map((h) => h.toLowerCase())
          .includes(origin.toLowerCase())
      ) {
        return cb(null, true);
      }

      if (allowedDomains.has(requestHost)) return cb(null, true);

      const apiKey = req.query.key || req.body?.apiKey;
      if (!apiKey) return cb(null, false);

      try {
        const website = await Website.findOne(
          { apiKey, isActive: true },
          { domain: 1 },
        );
        if (!website) return cb(null, false);

        if (requestHost === website.domain.toLowerCase()) {
          allowedDomains.add(requestHost);
          return cb(null, true);
        }

        return cb(null, false);
      } catch (err) {
        return cb(err);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })(req, res, next);
};

module.exports = corsMiddleware;
