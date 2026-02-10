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
    allowedOrigins: [
      ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : []),
      process.env.FRONTEND_URL,
    ],
  },
  isProduction: process.env.NODE_ENV === "production",
};

module.exports = config;
