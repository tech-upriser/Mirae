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
}

const formatDeadline = (value?: string) => {
  if (!value) return 'No deadline shared';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export function OpportunityDetail({ application, onClose }: Props) {
  const isHackathon = application.category === 'Hackathons';

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
        className="fixed right-0 top-0 z-50 flex h-screen w-[520px] flex-col bg-card shadow-2xl"
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

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-card-foreground"
            >
              <X className="h-5 w-5" />
            </button>
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
              <p className="text-sm text-foreground">{application.stage || 'Saved'}</p>
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
