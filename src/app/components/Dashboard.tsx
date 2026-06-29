import {
  Search,
  Plus,
  ExternalLink,
  Clock,
  MoreVertical,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApplicationDetail } from './ApplicationDetail';
import { AddManualModal } from './AddManualModal';
import { OpportunityDetail } from './OpportunityDetail';
import {
  deleteDashboardJob,
  getDashboardSummary,
  getRecentJobs,
  updateJobContacts,
  updateJobNotes,
} from '../services/dashboardService';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';

type DashboardTab = 'jobs' | 'hackathons' | 'others';
type SortOption = 'newest' | 'matchScore';
type CardVariant = 'default' | 'selected' | 'rejected';

interface Application {
  id: string;
  company: string;
  role: string;
  matchScore: number | null;
  matchPercentage?: number | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  jobSkills?: string[];
  resumeSkills?: string[];
  appliedDate: string;
  stage: string;
  category: string;
  companyAcronym: string;
  imageUrl: string;
  url: string;
  description: string;
  location: string;
  postedDate: string;
  deadline?: string;
  salaryRange: string;
  skills: {
    all: string[];
    matched: string[];
    missing: string[];
  };
  history: {
    status: string;
    date: string;
  }[];
  contacts?: {
    recruiterName: string;
    hiringManager: string;
  };
  notes?: string;
}

interface SectionConfig {
  key: string;
  title: string;
  apps: Application[];
  variant?: CardVariant;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString();
};

const getCompanyAcronym = (company: string) =>
  company
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// Generate a unique gradient for each company based on its name
const getCompanyGradient = (company: string): string => {
  let hash = 0;
  for (let i = 0; i < company.length; i++) {
    hash = company.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 35%) 0%, hsl(${h2}, 80%, 25%) 100%)`;
};

// Get the Google favicon URL for a domain
const getCompanyFaviconUrl = (job: any): string => {
  try {
    if (job.url && job.url.startsWith('http')) {
      const hostname = new URL(job.url).hostname;
      return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=64`;
    }
  } catch {}
  return '';
};

const normalizeDashboardCategory = (raw?: string | null): 'Jobs' | 'Hackathons' | 'Others' => {
  const value = (raw || '').toLowerCase().trim();
  if (value === 'jobs' || value === 'job') return 'Jobs';
  if (value === 'hackathons' || value === 'hackathon' || value === 'contest') return 'Hackathons';
  return 'Others';
};

const mapJobToApplication = (job: any): Application => ({
  id: job._id,
  company: job.company || 'Unknown Company',
  role: job.title || 'Untitled Role',
  matchScore: job.matchPercentage !== undefined && job.matchPercentage !== null ? job.matchPercentage : (job.matchScore ?? null),
  matchPercentage: job.matchPercentage !== undefined && job.matchPercentage !== null ? job.matchPercentage : (job.matchScore ?? null),
  matchedSkills: job.matchedSkills || job.skills?.matched || [],
  missingSkills: job.missingSkills || job.skills?.missing || [],
  jobSkills: job.jobSkills || job.skills?.all || [],
  resumeSkills: job.resumeSkills || [],
  appliedDate: formatDate(job.appliedDate || job.createdAt),
  stage: job.status || 'Saved',
  category: normalizeDashboardCategory(job.category),
  companyAcronym: getCompanyAcronym(job.company || 'UC'),
  imageUrl: getCompanyFaviconUrl(job),
  url: job.url || '',
  description: job.description || 'No job description provided.',
  location: job.location || 'Unknown Location',
  postedDate: job.postedDate || 'Unknown Date',
  deadline: job.deadline || '',
  salaryRange: job.salary || job.salaryRange || '',
  skills: {
    all: job.skills?.all || [],
    matched: job.matchedSkills || job.skills?.matched || [],
    missing: job.missingSkills || job.skills?.missing || []
  },
  history: Array.isArray(job.history)
    ? job.history
        .filter((event) => event && event.status)
        .map((event) => ({
          status: event.status,
          date: event.date || job.createdAt || new Date().toISOString(),
        }))
    : [],
  contacts: {
    recruiterName: job.contacts?.recruiterName || '',
    hiringManager: job.contacts?.hiringManager || '',
  },
  notes: job.notes || '',
});

const buildSummary = (apps: Application[]) => ({
  totalJobs: apps.length,
  saved: apps.filter((app) => app.stage === 'Saved').length,
  applied: apps.filter((app) => app.stage === 'Applied').length,
  interviewing: apps.filter((app) => app.stage === 'Interviewing').length,
  offers: apps.filter((app) => app.stage === 'Offer').length,
  rejected: apps.filter((app) => app.stage === 'Rejected').length,
});

export function Dashboard() {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('jobs');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      const [, recentJobs] = await Promise.all([
        getDashboardSummary(),
        getRecentJobs(sortBy, searchQuery),
      ]);

      setApplications((recentJobs || []).map(mapJobToApplication));
    } catch (error) {
      console.error('[Dashboard] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useRealtimeUpdates(() => {
    // When a socket event fires, re-fetch the dashboard
    void loadDashboard();
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      window.postMessage({ type: 'MIRAE_SYNC_TOKEN', token }, '*');
    }

    void loadDashboard();
  }, [sortBy, searchQuery]);

  useEffect(() => {
    const closeMenu = () => setMenuOpenId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('isLoggedIn');
    navigate('/', { replace: true });
  };

  const handleDelete = async (appId: string) => {
    const confirmed = window.confirm(
      'Delete this card permanently? This will remove it from the database too.'
    );

    if (!confirmed) return;

    try {
      setDeletingId(appId);
      setMenuOpenId(null);
      await deleteDashboardJob(appId);

      setApplications((currentApps) => {
        const nextApps = currentApps.filter((app) => app.id !== appId);
        if (selectedApp?.id === appId) {
          setSelectedApp(null);
        }

        return nextApps;
      });
    } catch (error) {
      console.error('[Dashboard] Delete error:', error);
      window.alert('Failed to delete card. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      const response = await updateJobStatus(appId, newStatus);
      const updatedApp = response?.job ? mapJobToApplication(response.job) : null;

      setApplications((currentApps) => {
        const nextApps = currentApps.map((app) =>
          app.id === appId
            ? updatedApp || { ...app, stage: newStatus }
            : app
        );

        if (selectedApp?.id === appId) {
          setSelectedApp((prev) =>
            prev
              ? updatedApp || { ...prev, stage: newStatus }
              : null
          );
        }

        return nextApps;
      });
    } catch (error) {
      console.error('[Dashboard] Update status error:', error);
      window.alert('Failed to update status. Please try again.');
    }
  };


  const handleContactsSaved = async (
    appId: string,
    recruiterName: string,
    hiringManager: string
  ) => {
    try {
      const response = await updateJobContacts(appId, recruiterName, hiringManager);
      const updatedApp = response?.job ? mapJobToApplication(response.job) : null;

      if (!updatedApp) return;

      setApplications((currentApps) =>
        currentApps.map((app) => (app.id === appId ? updatedApp : app))
      );

      setSelectedApp((prev) => (prev?.id === appId ? updatedApp : prev));
    } catch (error) {
      console.error('[Dashboard] Save contacts error:', error);
      window.alert('Failed to save contacts. Please try again.');
    }
  };


  const handleNotesSaved = async (appId: string, notes: string) => {
    try {
      const response = await updateJobNotes(appId, notes);
      const updatedApp = response?.job ? mapJobToApplication(response.job) : null;

      if (!updatedApp) return;

      setApplications((currentApps) =>
        currentApps.map((app) => (app.id === appId ? updatedApp : app))
      );

      setSelectedApp((prev) => (prev?.id === appId ? updatedApp : prev));
    } catch (error) {
      console.error('[Dashboard] Save notes error:', error);
      window.alert('Failed to save note. Please try again.');
    }
  };

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      return activeTab === 'jobs'
        ? app.category === 'Jobs'
        : activeTab === 'hackathons'
        ? app.category === 'Hackathons'
        : app.category === 'Others';
    });
  }, [applications, activeTab]);

  const activeSummary = useMemo(() => buildSummary(filteredApps), [filteredApps]);

  const sortButtonLabel =
    sortBy === 'newest' ? 'Sort by Best Match' : 'Sort by Newest';

  const handleSortToggle = () => {
    setSortBy((current) => (current === 'newest' ? 'matchScore' : 'newest'));
  };

  const jobsSections = useMemo<SectionConfig[]>(
    () => [
      {
        key: 'jobs-saved',
        title: 'Saved',
        apps: filteredApps.filter((app) => app.stage === 'Saved'),
      },
      {
        key: 'jobs-applied',
        title: 'Applied / Interviewing',
        apps: filteredApps.filter(
          (app) => app.stage === 'Applied' || app.stage === 'Interviewing'
        ),
      },
      {
        key: 'jobs-offers',
        title: 'Offers',
        apps: filteredApps.filter((app) => app.stage === 'Offer'),
        variant: 'selected',
      },
      {
        key: 'jobs-rejected',
        title: 'Rejected',
        apps: filteredApps.filter((app) => app.stage === 'Rejected'),
        variant: 'rejected',
      },
    ],
    [filteredApps]
  );

  const hackathonSections = useMemo<SectionConfig[]>(
    () => [
      {
        key: 'hackathons-saved',
        title: 'Saved',
        apps: filteredApps.filter((app) => app.stage === 'Saved'),
      },
      {
        key: 'hackathons-registered',
        title: 'Registered',
        apps: filteredApps.filter((app) => app.stage === 'Registered'),
      },
      {
        key: 'hackathons-participated',
        title: 'Participated',
        apps: filteredApps.filter((app) => app.stage === 'Participated'),
      },
      {
        key: 'hackathons-completed',
        title: 'Completed / Won',
        apps: filteredApps.filter((app) => app.stage === 'Completed' || app.stage === 'Won'),
        variant: 'selected',
      },
    ],
    [filteredApps]
  );

  const othersSections = useMemo<SectionConfig[]>(
    () => [
      {
        key: 'others-saved',
        title: 'Saved',
        apps: filteredApps.filter((app) => app.stage === 'Saved'),
      },
      {
        key: 'others-active',
        title: 'Active',
        apps: filteredApps.filter((app) => app.stage === 'Active'),
      },
      {
        key: 'others-completed',
        title: 'Completed',
        apps: filteredApps.filter((app) => app.stage === 'Completed'),
        variant: 'selected',
      },
      {
        key: 'others-rejected',
        title: 'Rejected / Lost',
        apps: filteredApps.filter((app) => app.stage === 'Rejected' || app.stage === 'Lost'),
        variant: 'rejected',
      },
    ],
    [filteredApps]
  );

  const currentSections =
    activeTab === 'jobs'
      ? jobsSections
      : activeTab === 'hackathons'
      ? hackathonSections
      : othersSections;

  const currentSummaryText =
    activeTab === 'jobs'
      ? `Total Jobs: ${activeSummary.totalJobs} | Saved: ${activeSummary.saved} | Applied / Interviewing: ${activeSummary.applied + activeSummary.interviewing} | Offers: ${activeSummary.offers} | Rejected: ${activeSummary.rejected}`
      : activeTab === 'hackathons'
      ? `Total Hackathons/Contests: ${filteredApps.length} | Saved: ${hackathonSections[0].apps.length} | Registered: ${hackathonSections[1].apps.length} | Participated: ${hackathonSections[2].apps.length} | Completed: ${hackathonSections[3].apps.length}`
      : `Total Others: ${filteredApps.length} | Saved: ${othersSections[0].apps.length} | Active: ${othersSections[1].apps.length} | Completed: ${othersSections[2].apps.length} | Rejected: ${othersSections[3].apps.length}`;

  const renderCard = (
    app: Application,
    index: number,
    variant: CardVariant = 'default'
  ) => (
    <motion.div
      key={app.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={() => setSelectedApp(app)}
      className={`bg-card rounded-md overflow-visible shadow-[0_4px_6px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_16px_rgba(252,163,17,0.2)] transition-all duration-300 cursor-pointer group ${
        variant === 'rejected' ? 'opacity-60 grayscale-[0.3]' : ''
      } ${
        variant === 'selected'
          ? 'border-2 border-[#FCA311] ring-2 ring-[#FCA311] ring-opacity-20'
          : ''
      }`}
    >
      <div
        className="relative h-28 overflow-hidden flex items-center justify-center"
        style={{ background: getCompanyGradient(app.company) }}
      >
        <span className="text-white/20 font-bold text-5xl tracking-wider select-none">
          {app.companyAcronym}
        </span>
        <div className="absolute top-3 right-3 w-10 h-10 bg-card rounded-md flex items-center justify-center shadow-md overflow-hidden">
          {app.imageUrl ? (
            <img
              src={app.imageUrl}
              alt={app.company}
              className="w-6 h-6 object-contain"
              onError={(e) => {
                // Hide img and show text fallback
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) parent.innerHTML = `<span class="text-card-foreground font-bold text-sm">${app.companyAcronym}</span>`;
              }}
            />
          ) : (
            <span className="text-card-foreground font-bold text-sm">{app.companyAcronym}</span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg mb-1 leading-tight">
              {app.role}
            </h3>
            <p className="text-sm text-card-foreground">{app.company}</p>
          </div>
          {app.url && (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 ml-2 p-1 rounded hover:bg-[#FCA311]/10 transition-colors"
              title="Open original job listing"
            >
              <ExternalLink className="w-4 h-4 text-card-foreground opacity-40 hover:opacity-100 transition-opacity" />
            </a>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 gap-3">
          <div
            className={`px-3 py-1 rounded text-xs font-semibold ${
              variant === 'selected'
                ? 'bg-[#059669] text-white'
                : variant === 'rejected'
                ? 'bg-background text-card-foreground opacity-50'
                : 'bg-[#d4f4dd] text-[#16a34a]'
            }`}
          >
            {variant === 'selected'
              ? activeTab === 'hackathons'
                ? 'Accepted'
                : activeTab === 'others'
                ? 'Completed'
                : 'Offer Received!'
              : app.matchScore !== null
              ? `${app.matchScore}% Match`
              : activeTab === 'hackathons'
              ? 'Open details'
              : activeTab === 'others'
              ? 'Keep this handy'
              : 'Add resume for Match Score'}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-card-foreground opacity-60">
              <Clock className="w-3 h-3" />
              <span>{app.appliedDate}</span>
            </div>

            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId((current) => (current === app.id ? null : app.id));
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-card text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-card-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpenId === app.id && (
                <div className="absolute bottom-full right-0 z-30 mb-2 min-w-[150px] rounded-md border border-border bg-card p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(app.id);
                    }}
                    disabled={deletingId === app.id}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === app.id ? 'Deleting...' : 'Delete card'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="ml-60 min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="px-8 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-6">
              <div className="min-w-0">
                <h1
                  className="text-3xl font-bold text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Dashboard
                </h1>
                <p className="text-sm text-card-foreground opacity-70">
                  {activeTab === 'jobs'
                    ? 'Manage your job pipeline and momentum.'
                    : activeTab === 'hackathons'
                    ? 'Track the contests you want to join and the ones you have registered for.'
                    : 'Keep track of other opportunities you want to remember.'}
                </p>
              </div>
              <div className="relative hidden max-w-2xl flex-1 md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-card-foreground opacity-50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search applications..."
                  className="w-full rounded-md border border-border bg-card py-3 pl-12 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                />
              </div>
            </div>

            <div className="ml-6 flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="rounded-md border border-border px-5 py-3 font-semibold text-card-foreground transition-colors hover:border-[#FCA311] hover:text-[#FCA311]"
              >
                Logout
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-md bg-[#FCA311] px-6 py-3 font-semibold text-foreground shadow-md transition-all hover:bg-[#fdb748] hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Manual
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 mt-2">
          <div className="flex gap-8">
            {([
              { value: 'jobs', label: 'Jobs' },
              { value: 'hackathons', label: 'Hackathons/Contests' },
              { value: 'others', label: 'Others' },
            ] as const).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`py-3 px-2 relative transition-all ${
                  activeTab === tab.value
                    ? 'text-foreground font-bold'
                    : 'text-card-foreground opacity-60 hover:opacity-100'
                }`}
              >
                {tab.label}
                {activeTab === tab.value && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#000000] dark:bg-[#FCA311]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="text-sm text-card-foreground">
            {loading ? 'Loading dashboard...' : currentSummaryText}
          </div>

          <button
            type="button"
            onClick={handleSortToggle}
            className="inline-flex items-center gap-2 rounded-md border border-[#D5D9E2] dark:border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground shadow-sm transition-colors hover:border-[#FCA311] hover:bg-[#FFF9F0] dark:hover:bg-[#FCA311]/10"
          >
            <ArrowUpDown className="h-4 w-4 text-[#6B7280]" />
            <span>{sortButtonLabel}</span>
          </button>
        </div>

        {currentSections.map((section, sectionIndex) => (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: sectionIndex * 0.12 }}
            className="mb-12"
          >
            <h2
              className="text-3xl font-bold text-foreground mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {section.title} ({section.apps.length})
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {section.apps.map((app, index) =>
                renderCard(app, index, section.variant || 'default')
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {selectedApp &&
        (selectedApp.category === 'Jobs' ? (
          <ApplicationDetail
            application={selectedApp}
            onClose={() => setSelectedApp(null)}
            onStatusChange={handleStatusChange}
            onContactsSaved={handleContactsSaved}
            onNotesSaved={handleNotesSaved}
          />
        ) : (
          <OpportunityDetail
            application={selectedApp}
            onClose={() => setSelectedApp(null)}
            onStatusChange={handleStatusChange}
          />
        ))}

      {showAddModal && (
        <AddManualModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => {
            void (async () => {
              try {
                const recentJobs = await getRecentJobs(sortBy, searchQuery);
                setApplications((recentJobs || []).map(mapJobToApplication));
              } catch (err) {
                console.error("Refresh error:", err);
              }
            })();
          }}
        />
      )}
    </div>
  );
}
