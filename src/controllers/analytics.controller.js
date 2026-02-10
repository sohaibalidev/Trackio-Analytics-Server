const { Analytics, Website } = require("../models/");

exports.trackSessionEnd = async (req, res) => {
  try {
    const { apiKey, sessionId, duration } = req.body;

    const website = await Website.findOne({ apiKey });

    if (!website || !website.isActive) {
      return res.status(404).json({ message: "Website not found or inactive" });
    }

    const result = await Analytics.updateMany(
      {
        websiteId: website._id,
        sessionId: sessionId,
        sessionDuration: null,
      },
      {
        $set: {
          sessionDuration: duration,
          lastActivity: new Date(),
        },
      },
    );

    res.status(200).json({
      success: true,
      updated: result.modifiedCount,
    });
  } catch (error) {
    console.error("Session end tracking error:", error);
    res.status(500).json({ message: "Session tracking failed" });
  }
};

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
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

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
        message: "Visitor already tracked for this page in the last hour",
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
      ipSource: trackingData.ipSource || "server",
      country: trackingData.country,
      city: trackingData.city,
      region: trackingData.region,
      isp: trackingData.isp,

      userAgent: trackingData.userAgent,
      browser: trackingData.browser,
      browserVersion: trackingData.browserVersion,
      os: trackingData.os,
      osVersion: trackingData.osVersion,
      device: trackingData.device,

      screenResolution: trackingData.screenResolution,
      viewportSize: trackingData.viewportSize,

      timezone: trackingData.timezone,

      referrer: trackingData.referrer,
      pageUrl: trackingData.pageUrl,
      pageTitle: trackingData.pageTitle,

      batteryLevel: trackingData.batteryLevel,
      batteryCharging: trackingData.batteryCharging,

      connection: trackingData.environment?.connection,

      doNotTrack: trackingData.environment?.doNotTrack,
      deviceMemory: trackingData.environment?.deviceMemory,

      timestamp: new Date(trackingData.timestamp),
      lastActivity: new Date(),
    });

    await analytics.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Tracking error:", error);
    res.status(500).json({ message: "Tracking failed" });
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
    startDate.setHours(startDate.getHours() - 24);

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

    const hourlyData = await Analytics.aggregate([
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

    const chartData = formatHourlyData(hourlyData);

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
    console.error("Dashboard analytics error:", error);
    res.status(500).json({ message: "Server error" });
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

    const browsers = await Analytics.aggregate([
      { $match: { websiteId: website._id, timestamp: { $gte: startDate } } },
      { $group: { _id: "$browser.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

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
          browsers,
          devices,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

function formatHourlyData(hourlyData) {
  const now = new Date();
  const chartData = [];

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now);
    hour.setHours(hour.getHours() - i);

    const hourStr = hour
      .toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .slice(0, 5);

    const matchingHour = hourlyData.find((h) => {
      const dataHour = new Date(h._id.date);
      dataHour.setHours(h._id.hour);
      return (
        dataHour.getHours() === hour.getHours() &&
        dataHour.getDate() === hour.getDate()
      );
    });

    chartData.push({
      time: hourStr,
      visitors: matchingHour ? matchingHour.visitors.length : 0,
      pageviews: matchingHour ? matchingHour.pageviews : 0,
    });
  }

  return chartData;
}

function generateEmptyChartData() {
  const chartData = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now);
    hour.setHours(hour.getHours() - i);

    const hourStr = hour
      .toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .slice(0, 5);

    chartData.push({
      time: hourStr,
      visitors: 0,
      pageviews: 0,
    });
  }

  return chartData;
}
