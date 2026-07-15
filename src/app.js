const express = require("express");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const sessionMiddleware = require("./middlewares/session");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const apiKeyMiddleware = require("./middlewares/apiKey");
const routes = require("./routes/index.routes");
const corsMiddleware = require("./middlewares/cors");
const config = require("./config");

require("./config/passport");

const app = express();

app.set("trust proxy", 1);

app.use(async (req, res, next) => {
  await config.initCors();
  corsMiddleware(req, res, next);
});

app.use(cookieParser());

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(compression());
app.use(morgan("dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(apiKeyMiddleware);
app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

app.use(routes);

module.exports = app;
