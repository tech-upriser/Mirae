const Job = require('../models/Job');

const getDashboardSummary = async (req, res) => {
  try {
    // console.log('[Dashboard API] Summary requested for userId:', req.user.id);
    const [
      totalJobs,
      saved,
      applied,
      interviewing,
      offers,
      rejected,
    ] = await Promise.all([
      Job.countDocuments({ userId: req.user.id }),
      Job.countDocuments({ userId: req.user.id, status: 'Saved' }),
      Job.countDocuments({ userId: req.user.id, status: 'Applied' }),
      Job.countDocuments({ userId: req.user.id, status: 'Interviewing' }),
      Job.countDocuments({ userId: req.user.id, status: 'Offer' }),
      Job.countDocuments({ userId: req.user.id, status: 'Rejected' }),
    ]);

    res.status(200).json({
      totalJobs,
      saved,
      applied,
      interviewing,
      offers,
      rejected,
    });
  } catch (error) {
    console.error('[Dashboard API] Summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

const getRecentJobs = async (req, res) => {
  try {
    const sortBy = req.query.sortBy === 'matchScore' ? 'matchScore' : 'newest';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const query = { userId: req.user.id };
    if (search) {
      query.$text = { $search: search };
    }

    const sortField =
      sortBy === 'matchScore'
        ? { status: 1, matchScore: -1, createdAt: -1 }
        : { status: 1, createdAt: -1 };

    const recentJobs = await Job.find(query)
      .sort(sortField)
      .limit(50)
      .select(
        'company title status category url description matchScore skills salary location appliedDate deadline createdAt postedDate history contacts notes'
      );

    res.status(200).json(recentJobs);
  } catch (error) {
    console.error('[Dashboard API] Recent jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch recent jobs' });
  }
};

module.exports = {
  getDashboardSummary,
  getRecentJobs,
};
