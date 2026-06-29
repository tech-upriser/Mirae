import {
  X,
  Calendar,
  MapPin,
  Building2,
  FileText,
  ExternalLink,
  BadgeCheck,
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

import { useState, useEffect } from 'react';

export function OpportunityDetail({ application, onClose, onStatusChange }: Props) {
  const isHackathon = application.category === 'Hackathons';
  const [status, setStatus] = useState(application.stage || 'Saved');

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
        <div className="sticky top-0 border-b border-border bg-card px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#FFF4DF] px-3 py-1 text-xs font-semibold text-[#C27A00]">
                <BadgeCheck className="h-3.5 w-3.5" />
                {isHackathon ? 'Hackathon / Contest' : 'Other Opportunity'}
              </div>

              <h2
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {application.role}
              </h2>
              <p className="mt-2 text-base text-card-foreground">{application.company}</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={status}
                onChange={handleStatusChange}
                className="px-4 py-2 bg-[#FCA311] text-primary-foreground rounded-md font-semibold hover:bg-[#fdb748] transition-all cursor-pointer outline-none appearance-none pr-8 relative"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
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
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-card-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
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
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#374151]">
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
              <p className="text-sm text-[#6B7280]">No source link was saved for this card.</p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
