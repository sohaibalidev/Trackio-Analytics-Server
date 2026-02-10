const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");

const {
  createWebsite,
  getWebsites,
  getWebsite,
  updateWebsite,
  deleteWebsite,
  regenerateApiKey,
} = require("../controllers/web.controller");

router.use(protect);

router.route("/").post(createWebsite).get(getWebsites);
router.route("/:id").get(getWebsite).put(updateWebsite).delete(deleteWebsite);
router.post("/:id/regenerate-key", regenerateApiKey);

module.exports = router;
