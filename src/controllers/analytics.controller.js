const { Analytics, Website } = require("../models/");
const {
  formatDailyData,
  generateEmptyChartData,
} = require("../utils/analytics");

exports.trackPageView = async (req, res) => {
  try {
    const { apiKey, ...trackingData } = req.body;

    const website = await Website.findOne({ apiKey });

    if (!website || !website.isActive) {
      return res.status(404).json({ message: "Website not found or inactive" });
    }

    let clientIp = req.ip || req.connection.remoteAddress;

    if (clientIp && clientIp.includes("::ffff:")) {
      clientIp = clientIp.replace("::ffff:", "");
    }

    const ipAddress = trackingData.ipAddress || clientIp;

    const oneHourAgo = new Date();
    oneHourAgo.setMinutes(oneHourAgo.getMinutes() - 10);

    const recentAnalytics = await Analytics.findOne({
      websiteId: website._id,
      visitorId: trackingData.visitorId,
      pageUrl: trackingData.pageUrl,
      timestamp: { $gte: oneHourAgo },
    });

    if (recentAnalytics) {
      await Analytics.findByIdAndUpdate(recentAnalytics._id, {
        lastActivity: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Visitor already tracked for this page in the last 10 minutes",
      });
    }

    const existingSession = await Analytics.findOne({
      websiteId: website._id,
      sessionId: trackingData.sessionId,
    }).sort({ timestamp: 1 });

    const analytics = new Analytics({
      websiteId: website._id,
      sessionId: trackingData.sessionId,
      visitorId: trackingData.visitorId,

      sessionStart: existingSession
        ? existingSession.sessionStart
        : new Date(trackingData.timestamp),
      sessionDuration: null,

      ipAddress: ipAddress,
      country: trackingData.country,
      city: trackingData.city,
      region: trackingData.region,
      isp: trackingData.isp,

      userAgent: trackingData.userAgent,
      os: trackingData.os,
      osVersion: trackingData.osVersion,
      device: trackingData.device,
      gpu: trackingData.gpu,
      speed: trackingData.speed,

      screenResolution: trackingData.screenResolution,

      timezone: trackingData.timezone,

      referrer: trackingData.referrer,
      pageUrl: trackingData.pageUrl,
      pageTitle: trackingData.pageTitle,

      batteryLevel: trackingData.batteryLevel,
      batteryCharging: trackingData.batteryCharging,

      timestamp: new Date(trackingData.timestamp),
      lastActivity: new Date(),
    });

    await analytics.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in trackpageview: ", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
    });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const { websiteId } = req.query;

    if (!websiteId) {
      return res.status(400).json({ message: "Website ID required" });
    }

    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user._id,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    const io = req.app.get("io");

    const activeCount = io.getActiveSessionsCount(websiteId);
    const sessions = io.getActiveSessionsForWebsite(websiteId);

    res.status(200).json({
      success: true,
      activeCount,
      sessions,
    });
  } catch (error) {
    console.error("Error in getActiveSessions: ", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
    });
  }
};

exports.getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { websiteId } = req.query;

    if (!websiteId) {
      return res.status(400).json({ message: "Website ID required" });
    }

    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user._id,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    const session = await Analytics.findOne({
      websiteId: website._id,
      sessionId: sessionId,
    }).sort({ timestamp: -1 });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const pageViews = await Analytics.find({
      websiteId: website._id,
      sessionId: sessionId,
    }).sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      session,
      pageViews,
      totalPageViews: pageViews.length,
    });
  } catch (error) {
    console.error("Error in getSessionDetails: ", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
    });
  }
};

exports.getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const websites = await Website.find({ userId });

    if (websites.length === 0) {
      return res.json({
        success: true,
        data: {
          totalVisitors: 0,
          totalPageViews: 0,
          activeSessions: 0,
          deviceData: [],
          chartData: generateEmptyChartData(),
          avgSessionDuration: 0,
        },
      });
    }

    const websiteIds = websites.map((w) => w._id);

    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 24 * 30);

    const totalVisitors = await Analytics.distinct("visitorId", {
      websiteId: { $in: websiteIds },
      timestamp: { $gte: startDate },
    });

    const totalPageViews = await Analytics.countDocuments({
      websiteId: { $in: websiteIds },
      timestamp: { $gte: startDate },
    });

    const activeSessionsThreshold = new Date();
    activeSessionsThreshold.setMinutes(
      activeSessionsThreshold.getMinutes() - 5,
    );

    const activeSessions = await Analytics.distinct("sessionId", {
      websiteId: { $in: websiteIds },
      timestamp: { $gte: activeSessionsThreshold },
    });

    const avgSessionDurationResult = await Analytics.aggregate([
      {
        $match: {
          websiteId: { $in: websiteIds },
          timestamp: { $gte: startDate },
          sessionDuration: { $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$sessionId",
          duration: { $first: "$sessionDuration" },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" },
        },
      },
    ]);

    const avgSessionDuration =
      avgSessionDurationResult.length > 0
        ? Math.round(avgSessionDurationResult[0].avgDuration / 1000)
        : 0;

    const devices = await Analytics.aggregate([
      {
        $match: {
          websiteId: { $in: websiteIds },
          timestamp: { $gte: startDate },
        },
      },
      { $group: { _id: "$device", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const deviceData = devices.map((device) => ({
      name: device._id.charAt(0).toUpperCase() + device._id.slice(1),
      value: device.count,
    }));

    const dailyData = await Analytics.aggregate([
      {
        $match: {
          websiteId: { $in: websiteIds },
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$timestamp" },
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          },
          visitors: { $addToSet: "$visitorId" },
          pageviews: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1, "_id.hour": 1 } },
    ]);

    const chartData = formatDailyData(dailyData);

    res.json({
      success: true,
      data: {
        totalVisitors: totalVisitors.length,
        totalPageViews,
        activeSessions: activeSessions.length,
        avgSessionDuration,
        deviceData,
        chartData,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardAnalytics: ", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
    });
  }
};

exports.getWebsiteAnalytics = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { period = "24h" } = req.query;

    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user.id,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    let startDate = new Date();
    switch (period) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setHours(startDate.getHours() - 24);
    }

    const analytics = await Analytics.find({
      websiteId: website._id,
      timestamp: { $gte: startDate },
    }).sort({ timestamp: -1 });

    const totalVisitors = await Analytics.distinct("visitorId", {
      websiteId: website._id,
      timestamp: { $gte: startDate },
    });

    const totalPageViews = await Analytics.countDocuments({
      websiteId: website._id,
      timestamp: { $gte: startDate },
    });

    const avgSessionDurationResult = await Analytics.aggregate([
      {
        $match: {
          websiteId: website._id,
          timestamp: { $gte: startDate },
          sessionDuration: { $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$sessionId",
          duration: { $first: "$sessionDuration" },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" },
        },
      },
    ]);

    const avgSessionDuration =
      avgSessionDurationResult.length > 0
        ? Math.round(avgSessionDurationResult[0].avgDuration / 1000)
        : 0;

    const devices = await Analytics.aggregate([
      { $match: { websiteId: website._id, timestamp: { $gte: startDate } } },
      { $group: { _id: "$device", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        analytics,
        stats: {
          totalVisitors: totalVisitors.length,
          totalPageViews,
          avgSessionDuration,
          devices,
        },
      },
    });
  } catch (error) {
    console.error("Error in getWebsiteAnalytics: ", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
    });
  }
};

exports.deleteVisitById = async (req, res) => {
  try {
    const { websiteId, visitId } = req.params;

    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user.id,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    const deleted = await Analytics.findOneAndDelete({
      _id: visitId,
      websiteId: website._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Analytics not found",
      });
    }

    res.json({
      success: true,
      message: "Analytics deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteVisitById:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.deleteAllAnalytics = async (req, res) => {
  try {
    const website = await Website.exists({
      _id: req.params.websiteId,
      userId: req.user.id,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    const result = await Analytics.deleteMany({ websiteId: website._id });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: "All analytics deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteAllAnalytics: ", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
    });
  }
};
