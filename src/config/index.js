require("dotenv").config();

const config = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  frontendUrl: process.env.FRONTEND_URL,
  apiUrl: process.env.API_URL,

  database: {
    uri: process.env.MONGODB_URI,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: `${process.env.API_URL}/api/auth/google/callback`,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE,
  },

  cors: {
    allowedOrigins: new Set(),
  },

  isProduction: process.env.NODE_ENV === "production",
};

config.initCors = async () => {
  const { Website } = require("../models");
  const getHostname = require("../utils/getHostname");

  config.cors.allowedOrigins.clear();

  // ENV frontend
  const frontendHost = getHostname(process.env.FRONTEND_URL);

  if (frontendHost) {
    config.cors.allowedOrigins.add(frontendHost);
  }

  // Database websites
  const websites = await Website.find({}, "url");

  websites.forEach((website) => {
    if (website.url) {
      config.cors.allowedOrigins.add(getHostname(website.url));
    }
  });

  console.log("========== CORS ALLOWED DOMAINS ==========");

  for (const origin of config.cors.allowedOrigins) {
    console.log(origin);
  }

  console.log("===========================================");
};

module.exports = config;
