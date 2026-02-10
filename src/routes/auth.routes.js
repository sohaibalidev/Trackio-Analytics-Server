const express = require("express");
const router = express.Router();
const passport = require("passport");
const { protect } = require("../middlewares/auth");

const {
  googleCallback,
  getCurrentUser,
  logout,
} = require("../controllers/auth.controller");

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleCallback,
);

router.post("/logout", protect, logout);

router.get("/me", protect, getCurrentUser);

module.exports = router;
