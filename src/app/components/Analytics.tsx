import { motion } from 'motion/react';
import { PieChart, Pie, Cell } from 'recharts';
import { MoreVertical } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  getAnalyticsOverview,
  getTrends,
  getSkillGapAnalysis,
  getMatchInsights,
  getFunnel,
  getResponseTimes,
  getCompanyBreakdown
} from '../services/analyticsService';

type OverviewData = {
  totalJobs: number;
  saved: number;
  applied: number;
  interviewing: number;
  offers: number;
  rejected: number;
  avgMatchScore: number;
  topSkills: { skill: string; count: number }[];
};

type SkillGapItem = {
  skill: string;
  frequency: number;
};
type MatchInsights = {
  allJobsAverage: number;
  interviewAverage: number;
  rejectedJobs: { company: string; title: string; rejectionReason?: string }[];
  offeredJobs: { company: string; title: string }[];
};

type TrendItem = {
  date: string;
  count: number;
};

type FunnelData = {
  funnel: { stage: string; count: number }[];
  conversionRates: {
    savedToApplied: string;
    appliedToInterview: string;
    interviewToOffer: string;
    overallOfferRate: string;
  };
};

type ResponseTimeData = {
  avgResponseTime: number;
  totalResponsesMeasured: number;
};

type CompanyBreakdownItem = {
  company: string;
  total: number;
  interviewing: number;
  offers: number;
  rejected: number;
  interviewRate: string;
};

export function Analytics() {
  const [activeCategory, setActiveCategory] = useState<'Jobs' | 'Hackathons' | 'Others'>('Jobs');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGapItem[]>([]);
  const [matchInsights, setMatchInsights] = useState<MatchInsights | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  
  // New Career OS Analytics state
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [responseTimes, setResponseTimes] = useState<ResponseTimeData | null>(null);
  const [companyBreakdown, setCompanyBreakdown] = useState<CompanyBreakdownItem[]>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [overviewData, trendsData, skillGapData, matchInsightsData, funnelRes, responseTimesRes, companyRes] = await Promise.all([
          getAnalyticsOverview(activeCategory),
          getTrends(activeCategory),
          getSkillGapAnalysis(activeCategory),
          getMatchInsights(activeCategory),
          getFunnel(activeCategory),
          getResponseTimes(activeCategory),
          getCompanyBreakdown(activeCategory)
        ]);

        setOverview(overviewData);
        setTrends(trendsData || []);
        setSkillGap(skillGapData || []);
        setMatchInsights(matchInsightsData || null);
        setFunnelData(funnelRes || null);
        setResponseTimes(responseTimesRes || null);
        setCompanyBreakdown(companyRes || []);
      } catch (error) {
        console.error('Analytics fetch error:', error);
      }
    };

    loadAnalytics();
  }, [activeCategory]);

  const donutData = useMemo(() => {
    const offers = overview?.offers ?? 0;
    const rejected = overview?.rejected ?? 0;
    const active =
      (overview?.saved ?? 0) +
      (overview?.applied ?? 0) +
      (overview?.interviewing ?? 0);

    return [
      { name: 'Offers', value: offers, color: '#067647' },
      { name: 'Rejected', value: rejected, color: '#B42318' },
      { name: 'Active', value: active, color: '#14213D' },
    ];
  }, [overview]);

  const topSkillBars = useMemo(() => {
    const topSkills = overview?.topSkills || [];
    const max = topSkills.length
      ? Math.max(...topSkills.map((item) => item.count))
      : 1;

    return topSkills.map((item) => ({
      skill: item.skill,
      count: item.count,
      max,
    }));
  }, [overview]);


  const skillGapBars = useMemo(() => {
    const max = skillGap.length
      ? Math.max(...skillGap.map((item) => item.frequency))
      : 1;

    return skillGap.map((item) => ({
      skill: item.skill,
      frequency: item.frequency,
      max,
    }));
  }, [skillGap]);

  const funnelSteps = useMemo(() => {
    if (funnelData?.funnel) {
      const colors = {
        'Saved': '#6b7280',
        'Applied': '#14213D',
        'Interviewing': '#FCA311',
        'Offer': '#067647'
      };
      const total = funnelData.funnel[0]?.count || 1;
      return funnelData.funnel.map(step => ({
        label: step.stage,
        value: step.count,
        percent: Math.round((step.count / total) * 100),
        color: colors[step.stage as keyof typeof colors] || '#000'
      }));
    }
    // Fallback if API fails
    const total = overview?.totalJobs ?? 0;
    const calcPercent = (value: number) =>
      total > 0 ? Math.round((value / total) * 100) : 0;

    return [
      {
        label: 'Saved',
        value: overview?.saved ?? 0,
        percent: calcPercent(overview?.saved ?? 0),
        color: '#6b7280',
      },
      {
        label: 'Applied / Interviewing',
        value: (overview?.applied ?? 0) + (overview?.interviewing ?? 0),
        percent: calcPercent((overview?.applied ?? 0) + (overview?.interviewing ?? 0)),
        color: '#14213D',
      },
      {
        label: 'Offer',
        value: overview?.offers ?? 0,
        percent: calcPercent(overview?.offers ?? 0),
        color: '#067647',
      },
    ];
  }, [overview, funnelData]);


  const summaryPills = useMemo(() => {
    const totalJobs = overview?.totalJobs ?? 0;
    const saved = overview?.saved ?? 0;
    const applied = overview?.applied ?? 0;
    const interviewing = overview?.interviewing ?? 0;
    const offers = overview?.offers ?? 0;
    const rejected = overview?.rejected ?? 0;

    const formatPercent = (value: number) =>
      totalJobs > 0 ? `${Math.round((value / totalJobs) * 100)}%` : '0%';

    return {
      saved:
        saved > 0 ? `${formatPercent(saved)} of pipeline saved` : 'No saved records yet',
      applied:
        interviewing > 0
          ? `${interviewing} in interview stage`
          : applied > 0
            ? (activeCategory === 'Jobs' ? 'Awaiting responses' : 'Registered / Applied')
            : (activeCategory === 'Jobs' ? 'No active applications' : 'No active registrations'),
      rejected:
        rejected > 0 ? `${formatPercent(rejected)} closed out` : 'No rejections yet',
      offers:
        offers > 0 ? `${formatPercent(offers)} reached offer` : 'No offers yet',
    };
  }, [overview, activeCategory]);


  const rejectedJobs = matchInsights?.rejectedJobs || [];
  const offeredJobs = matchInsights?.offeredJobs || [];

  return (
    <div className="ml-60 min-h-screen bg-[#E5E5E5] pb-6">
      <div className="bg-white border-b border-[#E5E5E5] px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-[#000000]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Analytics & Insights
          </h1>
          <button className="p-2 hover:bg-[#E5E5E5] rounded transition-colors">
            <MoreVertical className="w-5 h-5 text-[#14213D]" />
          </button>
        </div>
        <div className="mt-4 flex gap-6">
          {(['Jobs', 'Hackathons', 'Others'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeCategory === cat
                  ? 'text-[#14213D]'
                  : 'text-[#6b7280] hover:text-[#14213D]'
              }`}
            >
              {cat}
              {activeCategory === cat && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14213D]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 pt-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white rounded-lg p-5 border border-[#E5E5E5] shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-[#14213D] mb-2 font-semibold opacity-60">
              SAVED
            </div>
            <div className="text-4xl font-bold text-[#000000] mb-3 leading-none">
              {overview?.saved ?? 0}
            </div>
            <div className="inline-flex items-center px-3 py-1.5 bg-[#DBEAFE] rounded-full">
              <span className="text-xs font-semibold text-[#1E40AF]">
                {summaryPills.saved}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-lg p-5 border border-[#E5E5E5] shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-[#14213D] mb-2 font-semibold opacity-60">
              APPLIED
            </div>
            <div className="text-4xl font-bold text-[#000000] mb-3 leading-none">
              {(overview?.applied ?? 0) + (overview?.interviewing ?? 0)}
            </div>
            <div className="inline-flex items-center px-3 py-1.5 bg-[#FEF3C7] rounded-full">
              <span className="text-xs font-semibold text-[#92400E]">
                {summaryPills.applied}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-white rounded-lg p-5 border border-[#E5E5E5] shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-[#14213D] mb-2 font-semibold opacity-60">
              REJECTED
            </div>
            <div className="text-4xl font-bold text-[#000000] mb-3 leading-none">
              {overview?.rejected ?? 0}
            </div>
            <div className="inline-flex items-center px-3 py-1.5 bg-[#FDE2E2] rounded-full">
              <span className="text-xs font-semibold text-[#B42318]">
                {summaryPills.rejected}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-lg p-5 border border-[#E5E5E5] shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-[#14213D] mb-2 font-semibold opacity-60">
              OFFERS
            </div>
            <div className="text-4xl font-bold text-[#000000] mb-3 leading-none">
              {overview?.offers ?? 0}
            </div>
            <div className="inline-flex items-center px-3 py-1.5 bg-[#DDF7EA] rounded-full">
              <span className="text-xs font-semibold text-[#067647]">
                {summaryPills.offers}
              </span>
            </div>
          </motion.div>
        </div>

        {activeCategory === 'Jobs' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
            >
              <h3 className="text-lg font-bold text-[#000000] mb-5">
                Application Funnel
              </h3>

              <div className="space-y-4">
                {funnelSteps.map((step, index) => (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#14213D]">
                        {step.label}
                      </span>
                      <span className="text-sm font-bold text-[#000000]">
                        {step.value}{' '}
                        <span className="text-[#6b7280] font-normal">
                          ({step.percent}%)
                        </span>
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${step.percent}%` }}
                        transition={{ duration: 0.6, delay: 0.3 + index * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: step.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#000000]">
                  Final Outcomes
                </h3>
                <span className="text-sm text-[#6b7280] font-medium">
                  {overview?.totalJobs ?? 0} jobs
                </span>
              </div>

              <div className="flex items-center justify-center mb-6 relative">
                <PieChart width={240} height={240}>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell
                        key={`donut-cell-${entry.name}-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                </PieChart>

                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-3xl font-bold text-[#000000]">
                    {overview?.totalJobs ?? 0}
                  </div>
                  <div className="text-xs text-[#6b7280]">jobs</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6">
                {donutData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-sm">
                      <span className="font-semibold text-[#000000]">
                        {item.name}
                      </span>
                      <span className="text-[#6b7280] ml-1">
                        ({item.value})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
          >
            <h3 className="text-lg font-bold text-[#000000] mb-4">
              Top Skills
            </h3>

            <div className="space-y-3">
              {topSkillBars.length === 0 ? (
                <p className="text-sm text-[#6b7280]">No skill data yet.</p>
              ) : (
                topSkillBars.map((skill, index) => {
                  const widthPercent =
                    skill.max > 0 ? (skill.count / skill.max) * 100 : 0;

                  return (
                    <div key={skill.skill}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-[#14213D]">
                          {skill.skill}
                        </span>
                        <span className="text-sm font-bold text-[#000000]">
                          {skill.count}
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E5E5]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPercent}%` }}
                          transition={{
                            duration: 0.6,
                            delay: 0.35 + index * 0.05,
                          }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: index === 1 ? '#FCA311' : '#14213D',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
          >
            <h3 className="text-lg font-bold text-[#000000] mb-4">
              Top Missing Skills
            </h3>

            <div className="space-y-3">
              {skillGapBars.length === 0 ? (
                <p className="text-sm text-[#6b7280]">No missing-skill data yet.</p>
              ) : (
                skillGapBars.map((skill, index) => {
                  const widthPercent =
                    skill.max > 0 ? (skill.frequency / skill.max) * 100 : 0;

                  return (
                    <div key={skill.skill}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-[#14213D]">
                          {skill.skill}
                        </span>
                        <span className="text-sm font-bold text-[#000000]">
                          {skill.frequency}
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#FDE2E2]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPercent}%` }}
                          transition={{
                            duration: 0.6,
                            delay: 0.35 + index * 0.05,
                          }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: index === 0 ? '#B42318' : '#FCA311',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        {activeCategory === 'Jobs' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="mt-6 bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-[#000000]">
              Match Insights
            </h3>
            <span className="text-sm text-[#6b7280] font-medium">
              Jobs only
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-[#E5E5E5] bg-[#F8FAFC] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Avg Match: All Jobs
              </div>
              <div className="mt-3 text-4xl font-bold text-[#14213D]">
                {matchInsights?.allJobsAverage ?? 0}%
              </div>
              <p className="mt-2 text-sm text-[#6b7280]">
                Average match score across every scored job in your pipeline.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E5E5] bg-[#FFF9F0] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#92400E]">
                Avg Match: Interviewing / Offer
              </div>
              <div className="mt-3 text-4xl font-bold text-[#92400E]">
                {matchInsights?.interviewAverage ?? 0}%
              </div>
              <p className="mt-2 text-sm text-[#8A5A14]">
                Average match score for the jobs that are progressing the furthest.
              </p>
            </div>
          </div>
        </motion.div>
        )}


        {activeCategory === 'Jobs' && (
        <div className="mt-6 grid grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#000000]">
                Rejection Breakdown
              </h3>
              <span className="text-sm font-medium text-[#6b7280]">
                {rejectedJobs.length} total
              </span>
            </div>

            <div className="space-y-4">
              {rejectedJobs.length === 0 ? (
                <p className="text-sm text-[#6b7280]">No rejected jobs to review yet.</p>
              ) : (
                rejectedJobs.map((job, index) => (
                  <div
                    key={`${job.company}-${job.title}-${index}`}
                    className="flex items-start justify-between gap-4 border-b border-[#F1F3F5] pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#000000]">{job.company}</div>
                      <div className="text-sm text-[#6b7280]">{job.title}</div>
                      <div className="mt-2 text-sm text-[#6b7280]">
                        {job.rejectionReason || 'Not specified'}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#FDE2E2] px-3 py-1 text-xs font-semibold text-[#B42318]">
                      Rejected
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.45 }}
            className="bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#000000]">
                Offer Details
              </h3>
              <span className="text-sm font-medium text-[#6b7280]">
                {offeredJobs.length} active offers
              </span>
            </div>

            <div className="space-y-4">
              {offeredJobs.length === 0 ? (
                <p className="text-sm text-[#6b7280]">No active offers yet.</p>
              ) : (
                offeredJobs.map((job, index) => (
                  <div
                    key={`${job.company}-${job.title}-${index}`}
                    className="flex items-start justify-between gap-4 border-b border-[#F1F3F5] pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#000000]">{job.company}</div>
                      <div className="text-sm text-[#6b7280]">{job.title}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#DDF7EA] px-3 py-1 text-xs font-semibold text-[#067647]">
                      Offer
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 border-t border-[#F1F3F5] pt-4 text-sm text-[#6b7280]">
              Interview → Offer rate: 25% • Avg. time: 3 weeks
            </div>
          </motion.div>
        </div>
        )}

        {/* Career OS New Analytics */}
        {activeCategory === 'Jobs' && (
        <div className="mt-6 grid grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="col-span-1 bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
          >
            <h3 className="text-lg font-bold text-[#000000] mb-4">
              Pipeline Velocity
            </h3>
            
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-6xl font-black text-[#14213D] mb-2 tracking-tighter">
                {responseTimes?.avgResponseTime || 0}
              </div>
              <div className="text-sm font-semibold uppercase tracking-widest text-[#6b7280]">
                Days Average
              </div>
              <p className="mt-4 text-center text-sm text-[#6b7280]">
                From application submitted to interview scheduled across {responseTimes?.totalResponsesMeasured || 0} tracked responses.
              </p>
            </div>
            
            <div className="mt-4 rounded-lg bg-[#F8FAFC] p-4 text-center border border-[#E5E5E5]">
              <div className="text-xs font-semibold uppercase text-[#14213D]">
                Interview → Offer Rate
              </div>
              <div className="mt-1 text-2xl font-bold text-[#067647]">
                {funnelData?.conversionRates?.interviewToOffer || '0'}%
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.55 }}
            className="col-span-2 bg-white rounded-lg p-6 border border-[#E5E5E5] shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#000000]">
                Top Companies by Volume
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E5E5E5] bg-[#F8FAFC] text-xs uppercase text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Company</th>
                    <th className="px-4 py-3 font-semibold text-center">Total Apps</th>
                    <th className="px-4 py-3 font-semibold text-center">Interviewing</th>
                    <th className="px-4 py-3 font-semibold text-center">Offers</th>
                    <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {companyBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#6b7280]">
                        No company data available yet.
                      </td>
                    </tr>
                  ) : (
                    companyBreakdown.map((comp, idx) => (
                      <tr key={comp.company} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#14213D]">{comp.company}</td>
                        <td className="px-4 py-3 text-center text-[#6b7280]">{comp.total}</td>
                        <td className="px-4 py-3 text-center text-[#FCA311] font-medium">{comp.interviewing > 0 ? comp.interviewing : '-'}</td>
                        <td className="px-4 py-3 text-center text-[#067647] font-medium">{comp.offers > 0 ? comp.offers : '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                            Number(comp.interviewRate) > 0 ? 'bg-[#DDF7EA] text-[#067647]' : 'bg-[#F1F3F5] text-[#6b7280]'
                          }`}>
                            {comp.interviewRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
        )}
      </div>
    </div>
  );
}
