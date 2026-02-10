const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");

const {
  trackPageView,
  trackSessionEnd,
  getWebsiteAnalytics,
  getDashboardAnalytics,
} = require("../controllers/analytics.controller");

router.post("/track", trackPageView);
router.post("/session-end", trackSessionEnd);

router.get("/dashboard", protect, getDashboardAnalytics);
router.get("/website/:websiteId", protect, getWebsiteAnalytics);

module.exports = router;
