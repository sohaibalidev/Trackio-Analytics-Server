require("dotenv").config();

const config = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  frontendUrl: process.env.FRONTEND_URL,
  apiUrl: process.env.API_URL,
  database: { uri: process.env.MONGODB_URI },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: `${process.env.API_URL}/api/auth/google/callback`,
  },
  jwt: { secret: process.env.JWT_SECRET, expire: process.env.JWT_EXPIRE },
  cors: { allowedOrigins: new Set() },
  isProduction: process.env.NODE_ENV === "production",
};

config.initCors = async () => {
  const { Website } = require("../models");
  const getHostname = require("../utils/getHostname");

  try {
    const websites = await Website.find({}, "url");
    config.cors.allowedOrigins.clear();

    config.cors.allowedOrigins.add(getHostname(process.env.FRONTEND_URL));

    websites.forEach((w) => {
      if (w.url) config.cors.allowedOrigins.add(getHostname(w.url));
    });

    console.log(
      "Allowed CORS domains:",
      Array.from(config.cors.allowedOrigins),
    );
  } catch (err) {
    console.error("[CONFIG] Error loading websites:", err.message);
    throw err;
  }
};

module.exports = config;
