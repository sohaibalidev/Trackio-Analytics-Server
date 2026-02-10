const express = require("express");
const path = require("path");
const fs = require("fs");
const config = require("../config");

const router = express.Router();

const trackerScriptPath = path.join(__dirname, "../../public/js/tracker.min.js");

let trackerScriptTemplate = "";

try {
  trackerScriptTemplate = fs.readFileSync(trackerScriptPath, "utf8");
  console.log("Tracker script loaded");
} catch (err) {
  console.error("Failed to load tracker.js", err);
  trackerScriptTemplate = 'console.error("Tracker not available");';
}

router.get("/tracker.js", (req, res) => {
  const apiKey = req.query.key;

  if (!apiKey) {
    return res.status(400).send("API key required");
  }

  const configObject = {
    API_KEY: apiKey,
    TRACKER_URL: `${config.apiUrl}/api/analytics/track`,
    SESSION_END_URL: `${config.apiUrl}/api/analytics/session-end`,
    SESSION_DURATION: 60 * 60 * 1000,
  };

  res.set({
    "Content-Type": "application/javascript",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cross-Origin-Opener-Policy": "unsafe-none",
    "Cross-Origin-Embedder-Policy": "unsafe-none",
    "Cache-Control": "public, max-age=3600",
  });

  const script = `
    (function () {
      window.ANALYTICS_CONFIG = ${JSON.stringify(configObject)};

      ${trackerScriptTemplate}  
    })();
  `;

  res.send(script);
});

module.exports = router;
