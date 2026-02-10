const express = require("express");

const authRoutes = require("./auth.routes");
const websiteRoutes = require("./web.routes");
const analyticsRoutes = require("./analytics.routes");
const trackerRoutes = require("./tracker.routes");
const config = require("../config");

const router = express.Router();

router.use("/api/auth", authRoutes);
router.use("/api/websites", websiteRoutes);
router.use("/api/analytics", analyticsRoutes);

router.use("/", trackerRoutes);

router.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    token: req.cookies?.token ? "Token exists" : "No Token",
    user: req.user || "Not authenticated",
    env: config.env,
  });
});

router.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = router;
