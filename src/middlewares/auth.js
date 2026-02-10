const jwt = require("jsonwebtoken");
const { User } = require("../models");
const config = require("../config");

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = await User.findById(decoded.id).select("-googleId -__v");

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protect };
