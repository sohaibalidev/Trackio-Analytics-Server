const { Website, Analytics } = require("../models");
const generateApiKey = require("../utils/generateApiKey");

exports.createWebsite = async (req, res) => {
  try {
    const { name, url } = req.body;
    const domain = new URL(url).hostname;

    const website = new Website({
      userId: req.user.id,
      name,
      url,
      domain,
      apiKey: generateApiKey(),
    });

    await website.save();
    res.status(201).json({
      success: true,
      data: website,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getWebsites = async (req, res) => {
  try {
    const websites = await Website.find({ userId: req.user.id });

    res.json({
      success: true,
      data: websites,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getWebsite = async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    res.json({
      success: true,
      data: website,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateWebsite = async (req, res) => {
  try {
    const { name, url, isActive } = req.body;

    const website = await Website.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, url, isActive },
      { new: true },
    );

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    res.json({
      success: true,
      data: website,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteWebsite = async (req, res) => {
  try {
    const website = await Website.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    await Analytics.deleteMany({ websiteId: website._id });

    res.json({
      success: true,
      message: "Website and all analytics deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.regenerateApiKey = async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    website.apiKey = generateApiKey();
    await website.save();

    res.json({
      success: true,
      data: website,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
