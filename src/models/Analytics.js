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
  country: String,
  city: String,
  region: String,
  isp: String,

  userAgent: String,
  os: String,
  osVersion: String,
  device: String,
  gpu: String,
  speed: String, 

  screenResolution: {
    width: Number,
    height: Number,
  },

  timezone: String,

  referrer: String,
  pageUrl: String,
  pageTitle: String,

  batteryLevel: Number,
  batteryCharging: Boolean,

  timestamp: Date,
  lastActivity: Date,
});

analyticsSchema.index({ websiteId: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1 });
analyticsSchema.index({ visitorId: 1 });

const Analytics = mongoose.model("Analytics", analyticsSchema);
module.exports = Analytics;
