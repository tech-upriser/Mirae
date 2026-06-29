const { google } = require("googleapis");
const User = require("../models/User"); // Adjust path if necessary

// Initialize the Google OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

// Step 1: Generate the URL for the frontend to redirect to
const getAuthUrl = (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/gmail.readonly"];

  // We pass the user ID in the 'state' parameter so we know who logged in
  // when Google redirects back to our callback route.
  const state = req.user.id.toString();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // Crucial: gets us a refresh token so the user stays connected
    prompt: "consent", // Forces the consent screen to guarantee a refresh token
    scope: scopes,
    state: state,
  });

  res.status(200).json({ url });
};

// Step 2: Handle the callback from Google
const handleOAuthCallback = async (req, res) => {
  const { code, state: userId } = req.query;

  // Check if state is a valid Mongo ObjectId
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    // This is the Google Calendar callback which uses a JWT in state
    return res.redirect(`/api/auth/google/callback?code=${code}&state=${encodeURIComponent(userId)}`);
  }

  try {
    // Exchange the authorization code for actual usable tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Save these tokens directly to the user's document in MongoDB
    // Note: You will need to add a 'gmailTokens' object to your User schema later
    await User.findByIdAndUpdate(userId, {
      gmailTokens: tokens,
      isGmailConnected: true,
    });

    // Redirect the user back to your frontend settings page
    // Change the port if your Vite frontend runs on something other than 5173
    res.redirect("http://localhost:5173/settings?integration=success");
  } catch (error) {
    console.error("Error during Google OAuth callback:", error);
    res.redirect("http://localhost:5173/settings?integration=error");
  }
};

const startWatching = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.gmailTokens) {
      return res
        .status(400)
        .json({ error: "User has not connected Gmail yet." });
    }

    // Set the user's credentials
    oauth2Client.setCredentials(user.gmailTokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Tell Gmail to start watching!
    const response = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: "projects/mirae-500812/topics/mirae-gmail-events",
        labelIds: ["INBOX"], // We only care about emails hitting the inbox
      },
    });

    res
      .status(200)
      .json({ message: "Watch started successfully!", data: response.data });
  } catch (error) {
    console.error("Failed to start watch:", error);
    res.status(500).json({ error: "Failed to start watch" });
  }
};

const disconnect = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.gmailTokens = undefined;
    user.isGmailConnected = false;
    await user.save();
    res.status(200).json({ message: "Gmail disconnected" });
  } catch (error) {
    console.error("Disconnect error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.isGmailConnected || !user.gmailTokens) {
      return res.status(200).json({ isConnected: false });
    }

    return res.status(200).json({ isConnected: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  startWatching, // NEW
  disconnect,
  getStatus,
};
