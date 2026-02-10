const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Website",
    required: true,
  },
  sessionId: String,
  visitorId: String,

  sessionStart: Date,
  sessionDuration: Number,

  ipAddress: String,
  ipSource: String,
  country: String,
  city: String,
  region: String,
  isp: String,

  userAgent: String,
  browser: String,
  browserVersion: String,
  os: String,
  osVersion: String,
  device: String,

  screenResolution: {
    width: Number,
    height: Number,
  },
  viewportSize: {
    width: Number,
    height: Number,
  },

  timezone: String,

  referrer: String,
  pageUrl: String,
  pageTitle: String,

  batteryLevel: Number,
  batteryCharging: Boolean,

  connection: {
    effectiveType: String,
    downlink: Number,
    rtt: Number,
    saveData: Boolean,
  },

  doNotTrack: String,
  deviceMemory: Number,

  timestamp: Date,
  lastActivity: Date,
});

analyticsSchema.index({ websiteId: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1 });
analyticsSchema.index({ visitorId: 1 });

const Analytics = mongoose.model("Analytics", analyticsSchema);
module.exports = Analytics;
