const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // 🔐 NEW: Tie this job to a specific user account
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // 1. Core Scraped Data (From the Chrome Extension)
  title: { type: String, required: true },
  company: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String },
  
  // 2. Kanban Dashboard Status
  status: {
    type: String,
    default: 'Saved' // Every new scraped job starts here automatically
  },

  // 3. Smart Features (Populated later by your AI backend)
  matchScore: { type: Number, default: null }, // e.g., 88
  skills: {
    all: { type: [String], default: [] },
    matched: { type: [String], default: [] },
    missing: { type: [String], default: [] }
  },
  jobSkills: { type: [String], default: [] },
  postedDate: { type: String, default: '' },

  // 4. Details (Can be scraped, or added manually later via your popup form)
  location: { type: String, default: '' },
  salary: { type: String, default: '' },
  category: { 
    type: String, 
    enum: ['Jobs', 'Hackathons', 'Others', 'Internships', 'Open Source', 'Other'], 
    default: 'Jobs' 
  },
  
  // 5. Timeline & Tracking
  deadline: { type: Date, default: null },
  rejectionReason: { type: String, default: 'Not specified' },
  appliedDate: { type: Date, default: null },
  history: [{
    status: { type: String },
    date: { type: Date, default: Date.now }
  }],
  contacts: {
    recruiterName: { type: String, default: '' },
    hiringManager: { type: String, default: '' }
  },
  notes: { type: String, default: '' }

}, { 
  // This automatically adds 'createdAt' and 'updatedAt' timestamps to every document!
  timestamps: true 
});

jobSchema.virtual('matchPercentage').get(function() {
  return this.matchScore;
});
jobSchema.virtual('matchedSkills').get(function() {
  return this.skills ? this.skills.matched : [];
});
jobSchema.virtual('missingSkills').get(function() {
  return this.skills ? this.skills.missing : [];
});

jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

jobSchema.index({ userId: 1, status: 1, matchScore: -1 });
jobSchema.index({ title: 'text', company: 'text' });

module.exports = mongoose.model('Job', jobSchema);
