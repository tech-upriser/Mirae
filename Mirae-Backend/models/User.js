const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    tagline: {
      type: String,
      default: "",
    },
    // 📄 Stores the text extracted from the user's resume
    resumeText: {
      type: String,
      default: "",
    },
    resumeSkills: {
      type: [String],
      default: [],
    },
    // 📁 Stores metadata about the uploaded resume file
    resumeFileName: {
      type: String,
      default: "",
    },
    resumeUploadedAt: {
      type: Date,
      default: null,
    },
    socialLinks: [
      {
        id: String,
        platform: String,
        title: String,
        url: String,
        icon: String,
      },
    ],
    googleRefreshToken: {
      type: String,
      default: "",
    },
    googleAccessToken: {
      type: String,
      default: "",
    },
    googleTokenExpiry: {
      type: Number,
      default: 0,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    isGmailConnected: {
      type: Boolean,
      default: false,
    },
    gmailTokens: {
      type: Object, // This will store the access_token, refresh_token, etc.
      default: null,
    },
    lastHistoryId: {
      type: String,
      default: "",
    },
  },
  {
    // Automatically manages 'createdAt' and 'updatedAt' fields
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
