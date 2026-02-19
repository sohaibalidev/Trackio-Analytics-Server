const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");

const {
  trackPageView,
  getWebsiteAnalytics,
  getDashboardAnalytics,
  deleteVisitById,
  deleteAllAnalytics,
  getActiveSessions,
  getSessionDetails,
} = require("../controllers/analytics.controller");

router.post("/track", trackPageView);

router.get("/active-sessions", protect, getActiveSessions);
router.get("/session/:sessionId", protect, getSessionDetails);

router.get("/dashboard", protect, getDashboardAnalytics);
router.get("/website/:websiteId", protect, getWebsiteAnalytics);

router.delete("/:websiteId/all", protect, deleteAllAnalytics);
router.delete("/:websiteId/:visitId", protect, deleteVisitById);

module.exports = router;
