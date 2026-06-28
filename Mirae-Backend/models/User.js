const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  // 📄 Stores the text extracted from the user's resume
  // The AI will pull from here instead of using hardcoded details!
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
  socialLinks: [{
    id: String,
    platform: String,
    title: String,
    url: String,
    icon: String,
  }],
  googleRefreshToken: {
    type: String,
    default: '',
  },
  googleAccessToken: {
    type: String,
    default: '',
  },
  googleTokenExpiry: {
    type: Number,
    default: 0,
  },
  profilePhoto: {
    type: String,
    default: '',
  }
}, {
  // Automatically manages 'createdAt' and 'updatedAt' fields
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
