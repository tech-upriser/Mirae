const express = require("express");
const router = express.Router();
const {
  getAuthUrl,
  handleOAuthCallback,
  startWatching, // <-- ADDED THIS HERE
} = require("../controllers/gmailAuthController");
const { handleWebhook } = require("../controllers/gmailWebhookController");
const { protect } = require("../middlewares/authMiddleware");

// Authentication Routes
router.get("/auth", protect, getAuthUrl);
router.get("/oauth/callback", handleOAuthCallback);

// Webhook Route (Receives data from Google, no auth middleware needed)
router.post("/webhook", handleWebhook);

// Start Watching Route (Tells Google to start sending webhooks for this user)
router.post("/watch", protect, startWatching);

module.exports = router;
