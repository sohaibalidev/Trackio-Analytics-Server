const { Website } = require("../models");
const config = require("../config");

const apiKeyMiddleware = async (req, res, next) => {
  const apiKey = req.query.key || req.body?.apiKey;
  if (!apiKey) return next();

  try {
    const website = await Website.findOne({ apiKey, isActive: true });
    if (!website) return res.status(403).json({ error: "Invalid API key" });

    if (website.domain) {
      const domain = website.domain.toLowerCase();
      config.cors.allowedOrigins.add(domain);
    }

    req.website = website;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = apiKeyMiddleware;
