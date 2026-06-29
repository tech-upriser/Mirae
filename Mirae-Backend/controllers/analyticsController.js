const Job = require('../models/Job');
const mongoose = require('mongoose');

const getAnalyticsOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const category = req.query.category || 'Jobs';
    const jobs = await Job.find({ userId, category }).select(
      'status matchScore skills matchedSkills missingSkills company title createdAt'
    );

    const totalJobs = jobs.length;
    const saved = jobs.filter((job) => job.status === 'Saved').length;
    
    let offers = 0, rejected = 0, interviewing = 0, applied = 0;
    
    if (category === 'Hackathons') {
      applied = jobs.filter((job) => ['Registered', 'Applied'].includes(job.status)).length;
      interviewing = jobs.filter((job) => ['Participated', 'Interviewing'].includes(job.status)).length;
      offers = jobs.filter((job) => ['Won', 'Completed', 'Offer', 'Offered'].includes(job.status)).length;
      rejected = jobs.filter((job) => ['Lost', 'Rejected'].includes(job.status)).length;
    } else if (category === 'Others') {
      applied = jobs.filter((job) => ['Active', 'Applied', 'Registered'].includes(job.status)).length;
      offers = jobs.filter((job) => ['Completed', 'Won', 'Offer', 'Offered'].includes(job.status)).length;
      rejected = jobs.filter((job) => ['Lost', 'Rejected'].includes(job.status)).length;
    } else {
      offers = jobs.filter((job) => job.status === 'Offer' || job.status === 'Offered').length;
      rejected = jobs.filter((job) => job.status === 'Rejected').length;
      interviewing = jobs.filter((job) => job.status === 'Interviewing').length;
      applied = jobs.filter((job) => job.status === 'Applied').length;
    }

    // Only average jobs that actually have a match score (not null)
    const scoredJobs = jobs.filter((job) => job.matchScore !== null && job.matchScore !== undefined);
    const avgMatchScore =
      scoredJobs.length > 0
        ? Math.round(
            scoredJobs.reduce((sum, job) => sum + job.matchScore, 0) / scoredJobs.length
          )
        : 0;

    const skillCounts = {};
    jobs.forEach((job) => {
      const requiredSkills = job.skills?.all || job.skills?.matched || job.matchedSkills || [];
      requiredSkills.forEach((skill) => {
        if (!skill || skill === 'Unknown' || skill === 'Not specified') return;
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({
      totalJobs,
      saved,
      applied,
      interviewing,
      offers,
      rejected,
      avgMatchScore,
      topSkills,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
};

const getTrends = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const category = req.query.category || 'Jobs';
    const trends = await Job.aggregate([
      {
        $match: {
          userId,
          category,
          createdAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.day', 10] },
                  { $concat: ['0', { $toString: '$_id.day' }] },
                  { $toString: '$_id.day' },
                ],
              },
            ],
          },
          count: 1,
        },
      },
    ]);

    res.status(200).json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
};


const getSkillGapAnalysis = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const category = req.query.category || 'Jobs';
    const skillGapData = await Job.aggregate([
      { $match: { userId, category } },
      { $unwind: '$skills.missing' },
      {
        $match: {
          'skills.missing': {
            $type: 'string',
            $nin: ['', 'Unknown', 'Not specified'],
          },
        },
      },
      {
        $group: {
          _id: '$skills.missing',
          frequency: { $sum: 1 },
        },
      },
      { $sort: { frequency: -1, _id: 1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          skill: '$_id',
          frequency: 1,
        },
      },
    ]);

    res.status(200).json(skillGapData);
  } catch (error) {
    console.error('[Analytics API] Skill gap error:', error);
    res.status(500).json({ error: 'Failed to fetch skill gap analysis' });
  }
};

const getMatchInsights = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const category = req.query.category || 'Jobs';
    const [result] = await Job.aggregate([
      {
        $match: {
          userId,
          category,
        },
      },
      {
        $facet: {
          allJobsAverage: [
            { $match: { matchScore: { $ne: null } } },
            { $group: { _id: null, avgScore: { $avg: '$matchScore' } } },
          ],
          interviewAverage: [
            {
              $match: {
                status: { $in: ['Interviewing', 'Offer', 'Offered'] },
                matchScore: { $ne: null },
              },
            },
            { $group: { _id: null, avgScore: { $avg: '$matchScore' } } },
          ],
          rejectedJobs: [
            { 
              $match: category === 'Others' 
                ? { status: { $in: ['Rejected', 'Lost'] } }
                : { status: 'Rejected' } 
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 4 },
            {
              $project: {
                _id: 0,
                company: 1,
                title: 1,
                rejectionReason: 1,
              },
            },
          ],
          offeredJobs: [
            { 
              $match: category === 'Hackathons'
                ? { status: { $in: ['Won', 'Completed'] } }
                : category === 'Others'
                ? { status: 'Completed' }
                : { status: { $in: ['Offer', 'Offered'] } } 
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 4 },
            {
              $project: {
                _id: 0,
                company: 1,
                title: 1,
              },
            },
          ],
        },
      },
    ]);

    const allJobsAverage = Math.round(result?.allJobsAverage?.[0]?.avgScore || 0);
    const interviewAverage = Math.round(result?.interviewAverage?.[0]?.avgScore || 0);

    res.status(200).json({
      allJobsAverage,
      interviewAverage,
      rejectedJobs: result?.rejectedJobs || [],
      offeredJobs: result?.offeredJobs || [],
    });
  } catch (error) {
    console.error('[Analytics API] Match insights error:', error);
    res.status(500).json({ error: 'Failed to fetch match insights' });
  }
};

const getFunnel = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const category = req.query.category || 'Jobs';
    const jobs = await Job.find({ userId, category }).select('status');
    
    let saved = 0, applied = 0, interviewing = 0, offers = 0, rejected = 0;
    
    // For funnel to match KPI cards, we report the EXACT count in that stage.
    jobs.forEach(job => {
      if (job.status === 'Saved') saved++;
      else if (category === 'Hackathons') {
        if (['Registered', 'Applied'].includes(job.status)) applied++;
        else if (['Participated', 'Interviewing'].includes(job.status)) interviewing++;
        else if (['Won', 'Completed', 'Offer', 'Offered'].includes(job.status)) offers++;
        else if (['Lost', 'Rejected'].includes(job.status)) rejected++;
      } else if (category === 'Others') {
        if (['Active', 'Applied', 'Registered'].includes(job.status)) applied++;
        else if (['Completed', 'Won', 'Offer', 'Offered'].includes(job.status)) offers++;
        else if (['Lost', 'Rejected'].includes(job.status)) rejected++;
      } else {
        if (job.status === 'Applied') applied++;
        else if (job.status === 'Interviewing') interviewing++;
        else if (job.status === 'Offer' || job.status === 'Offered') offers++;
        else if (job.status === 'Rejected') rejected++;
      }
    });

    const totalOffers = offers;
    const totalInterviewing = interviewing;
    const totalApplied = applied;
    const totalSaved = saved;
    const totalJobs = jobs.length;

    // Use cumulative counts for accurate conversion rate calculations
    const cumulativeOffers = offers;
    const cumulativeInterviewing = interviewing + offers;
    const cumulativeApplied = applied + interviewing + offers;
    const cumulativeSaved = totalJobs;

    res.status(200).json({
      funnel: [
        { stage: 'Saved', count: totalSaved },
        { stage: 'Applied', count: totalApplied },
        { stage: 'Interviewing', count: totalInterviewing },
        { stage: 'Offer', count: totalOffers }
      ],
      conversionRates: {
        savedToApplied: cumulativeSaved ? ((cumulativeApplied / cumulativeSaved) * 100).toFixed(1) : 0,
        appliedToInterview: cumulativeApplied ? ((cumulativeInterviewing / cumulativeApplied) * 100).toFixed(1) : 0,
        interviewToOffer: cumulativeInterviewing ? ((cumulativeOffers / cumulativeInterviewing) * 100).toFixed(1) : 0,
        overallOfferRate: cumulativeSaved ? ((cumulativeOffers / cumulativeSaved) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch funnel' });
  }
};

const getResponseTimes = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const category = req.query.category || 'Jobs';
    const jobs = await Job.find({ userId, category }).select('history company');
    
    let totalAppliedToInterviewDays = 0;
    let appliedToInterviewCount = 0;

    let startStatus = 'Applied';
    let endStatus = 'Interviewing';
    let endStatusAlt = 'Offer';
    
    if (category === 'Hackathons') {
      startStatus = 'Registered';
      endStatus = 'Participated';
      endStatusAlt = 'Won';
    } else if (category === 'Others') {
      startStatus = 'Active';
      endStatus = 'In Progress';
      endStatusAlt = 'Completed';
    }

    jobs.forEach(job => {
      if (!job.history || job.history.length < 2) return;
      
      const appliedEvent = job.history.find(h => h.status === startStatus);
      let interviewEvent = job.history.find(h => h.status === endStatus);
      
      if (!interviewEvent) {
        interviewEvent = job.history.find(h => h.status === endStatusAlt || h.status === 'Completed');
      }
      
      if (appliedEvent && interviewEvent) {
        const diffTime = Math.abs(new Date(interviewEvent.date) - new Date(appliedEvent.date));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalAppliedToInterviewDays += diffDays;
        appliedToInterviewCount++;
      }
    });

    const avgResponseTime = appliedToInterviewCount ? Math.round(totalAppliedToInterviewDays / appliedToInterviewCount) : 0;
    
    res.status(200).json({
      avgResponseTime,
      totalResponsesMeasured: appliedToInterviewCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch response times' });
  }
};

const getCompanyBreakdown = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const category = req.query.category || 'Jobs';
    const jobs = await Job.find({ userId, category }).select('company status');
    
    const companyStats = {};
    
    const inProgressStatuses = category === 'Hackathons' ? ['Participated', 'Interviewing'] : category === 'Others' ? ['In Progress'] : ['Interviewing'];
    const successStatuses = category === 'Hackathons' ? ['Won', 'Completed', 'Offer', 'Offered'] : category === 'Others' ? ['Completed', 'Won', 'Offer', 'Offered'] : ['Offer', 'Offered'];
    const rejectStatuses = category === 'Others' ? ['Lost', 'Rejected'] : ['Rejected'];

    jobs.forEach(job => {
      const company = job.company;
      if (!companyStats[company]) {
        companyStats[company] = { total: 0, interviewing: 0, offers: 0, rejected: 0 };
      }
      companyStats[company].total++;
      if (inProgressStatuses.includes(job.status)) companyStats[company].interviewing++;
      if (successStatuses.includes(job.status)) companyStats[company].offers++;
      if (rejectStatuses.includes(job.status)) companyStats[company].rejected++;
    });

    const breakdown = Object.entries(companyStats)
      .map(([company, stats]) => ({
        company,
        ...stats,
        interviewRate: stats.total ? ((stats.offers) / stats.total * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 companies

    res.status(200).json(breakdown);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company breakdown' });
  }
};

module.exports = {
  getAnalyticsOverview,
  getTrends,
  getSkillGapAnalysis,
  getMatchInsights,
  getFunnel,
  getResponseTimes,
  getCompanyBreakdown
};

