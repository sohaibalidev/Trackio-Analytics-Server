const session = require("express-session");
const config = require("../config");

module.exports = session({
  resave: false,
  secret: config.jwt.secret,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
});
