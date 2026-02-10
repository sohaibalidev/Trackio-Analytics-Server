const { User } = require("../models/");
const config = require("../config");

exports.googleCallback = async (req, res) => {
  try {
    const token = req.user.generateAuthToken();
    res.cookie("token", token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "none",
    });
    const redirectUrl = `${config.frontendUrl}/auth/callback`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    const errorRedirectUrl = `${config.frontendUrl}/login?error=auth_failed`;
    res.redirect(errorRedirectUrl);
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-googleId -__v");
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "none",
    });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
