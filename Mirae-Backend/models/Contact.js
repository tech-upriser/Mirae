const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    linkedinUrl: {
      type: String,
    },
    company: {
      type: String,
    },
    role: {
      type: String, // "Recruiter", "Hiring Manager", "Interviewer"
      default: 'Recruiter'
    },
    jobIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    }],
    interactions: [{
      type: {
        type: String, // "email_sent", "email_received", "interview", "call"
      },
      date: {
        type: Date,
        default: Date.now
      },
      notes: {
        type: String,
      }
    }],
    lastContactDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contact', contactSchema);
