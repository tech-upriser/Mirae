const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getAnalyticsOverview,
  getTrends,
  getSkillGapAnalysis,
  getMatchInsights,
  getFunnel,
  getResponseTimes,
  getCompanyBreakdown
} = require('../controllers/analyticsController');

router.get('/overview', protect, getAnalyticsOverview);
router.get('/trends', protect, getTrends);
router.get('/skill-gap', protect, getSkillGapAnalysis);
router.get('/match-insights', protect, getMatchInsights);

// New AI Career OS routes
router.get('/funnel', protect, getFunnel);
router.get('/response-times', protect, getResponseTimes);
router.get('/company-breakdown', protect, getCompanyBreakdown);

module.exports = router;
