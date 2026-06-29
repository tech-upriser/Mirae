import {
  X,
  Calendar,
  MapPin,
  Building2,
  FileText,
  ExternalLink,
  BadgeCheck,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { motion } from 'motion/react';

interface OpportunityApplication {
  id: string;
  company: string;
  role: string;
  stage: string;
  category: string;
  url: string;
  description: string;
  location: string;
  deadline?: string;
  history?: { status: string; date: string }[];
}

interface Props {
  application: OpportunityApplication;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

const formatDeadline = (value?: string) => {
  if (!value) return 'No deadline shared';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatTimelineDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

import { useState, useEffect } from 'react';

export function OpportunityDetail({ application, onClose, onStatusChange }: Props) {
  const isHackathon = application.category === 'Hackathons';
  const [status, setStatus] = useState(application.stage || 'Saved');
  const [activeTab, setActiveTab] = useState('overview');
  const tabs = ['Overview', 'Timeline'];
  
  const timelineEvents = [...(application.history || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  useEffect(() => {
    setStatus(application.stage || 'Saved');
  }, [application.stage]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(application.id, newStatus);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed right-0 top-0 z-50 flex h-screen w-[600px] flex-col bg-card shadow-2xl"
      >
        <div className="bg-secondary text-secondary-foreground p-6 sticky top-0 z-10 border-b border-secondary-foreground/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary-foreground/10 px-3 py-1 text-xs font-semibold text-secondary-foreground">
                <BadgeCheck className="h-3.5 w-3.5" />
                {isHackathon ? 'Hackathon / Contest' : 'Other Opportunity'}
              </div>

              <h2
                className="text-2xl font-bold text-secondary-foreground mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {application.role}
              </h2>
              <p className="text-secondary-foreground/80 text-lg font-medium">{application.company}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative inline-block">
                <select
                  value={status}
                  onChange={handleStatusChange}
                  className="px-4 py-2 bg-secondary-foreground text-secondary rounded-md font-bold hover:bg-secondary-foreground/90 transition-all cursor-pointer outline-none appearance-none pr-8 border-none"
                >
                  {isHackathon ? (
                    <>
                      <option value="Saved">Saved</option>
                      <option value="Registered">Registered</option>
                      <option value="Participated">Participated</option>
                      <option value="Won">Won</option>
                      <option value="Completed">Completed</option>
                    </>
                  ) : (
                    <>
                      <option value="Saved">Saved</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Lost">Lost</option>
                      <option value="Rejected">Rejected</option>
                    </>
                  )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-secondary" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-secondary-foreground/80 transition hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-secondary-foreground/20 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`pb-3 text-sm font-bold transition-all relative ${
                  activeTab === tab.toLowerCase()
                    ? 'text-secondary-foreground'
                    : 'text-secondary-foreground/60 hover:text-secondary-foreground'
                }`}
              >
                {tab}
                {activeTab === tab.toLowerCase() && (
                  <motion.div
                    layoutId="activeTabOpp"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-foreground"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-card-foreground">
                    <Building2 className="h-4 w-4" />
                    Organizer
              </div>
              <p className="text-sm text-foreground">{application.company || 'Not shared'}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-card-foreground">
                <Calendar className="h-4 w-4" />
                Deadline
              </div>
              <p className="text-sm text-foreground">
                {formatDeadline(application.deadline)}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-card-foreground">
                <MapPin className="h-4 w-4" />
                Location
              </div>
              <p className="text-sm text-foreground">
                {application.location || 'Location not shared'}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 text-sm font-semibold text-card-foreground">Status</div>
              <p className="text-sm text-foreground">{status}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <FileText className="h-4 w-4" />
              Description
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {application.description || 'No description available yet.'}
            </p>
          </div>

          <div className="mt-6">
            {application.url ? (
              <a
                href={application.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-[#FCA311] px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#fdb748]"
              >
                <ExternalLink className="h-4 w-4" />
                Open Original Page
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No source link was saved for this card.</p>
              )}
            </div>
          </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full">
              <h3 className="text-lg font-bold text-foreground mb-6">Opportunity Journey</h3>

              {timelineEvents.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  No timeline events recorded yet.
                </div>
              ) : (
                <div className="mb-10 ml-2 space-y-6">
                  {timelineEvents.map((event, index) => {
                    const isNewest = index === 0;
                    const isFirstRecordedEvent = index === timelineEvents.length - 1;
                    const showConnector = index !== timelineEvents.length - 1;

                    return (
                      <div key={`${event.status}-${event.date}-${index}`} className="relative flex gap-4">
                        <div className="relative flex w-7 shrink-0 justify-center">
                          {showConnector && (
                            <div className="absolute top-8 bottom-[-1.5rem] w-0.5 bg-secondary text-secondary-foreground" />
                          )}
                          <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${isNewest ? 'border-[#14213D] bg-secondary text-secondary-foreground' : 'border-[#14213D] bg-card'}`}>
                            <Clock className={`h-3.5 w-3.5 ${isNewest ? 'text-white' : 'text-card-foreground'}`} />
                          </div>
                        </div>

                        <div className="pb-1">
                          <p className="font-bold text-card-foreground leading-tight">
                            {isFirstRecordedEvent ? 'Saved to Mirae' : `Moved to: ${event.status}`}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatTimelineDate(event.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
}
