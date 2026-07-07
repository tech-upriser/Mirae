const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // MongoDB will automatically delete the document 5 minutes after createdAt
    expires: 300,
  },
});

module.exports = mongoose.model('Otp', otpSchema);
