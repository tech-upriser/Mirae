import { X, BookOpen, Search, Briefcase, Calendar, BarChart3, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export function UserGuideModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState('getting-started');

  const tabs = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'pipeline', label: 'Pipeline Tracking', icon: Briefcase },
    { id: 'calendar', label: 'Calendar & Follow-ups', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'extension', label: 'Browser Extension', icon: Search },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-secondary p-6 text-secondary-foreground">
            <div>
              <h2 className="text-2xl font-bold font-display flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Mirae User Guide
              </h2>
              <p className="mt-1 text-sm opacity-80">
                Learn how to maximize your career command center.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-secondary-foreground/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-64 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#FCA311]/10 text-[#FCA311]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-[#FCA311]' : ''}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'getting-started' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-foreground">Welcome to Mirae</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Mirae is your personal Career Command Center. It's designed to bring clarity, rhythm, and calm to your opportunity search. Whether you are applying for jobs, registering for hackathons, or tracking other opportunities, Mirae keeps everything organized in one place.
                  </p>
                  <div className="rounded-xl border border-border bg-muted/30 p-6">
                    <h4 className="font-semibold text-foreground mb-4">Core Principles:</h4>
                    <ul className="space-y-3 text-sm text-muted-foreground list-disc pl-5">
                      <li><strong>Capture Quickly:</strong> Use the Chrome Extension to save jobs in one click.</li>
                      <li><strong>Track Effectively:</strong> Move applications through the pipeline stages (Saved $\rightarrow$ Applied $\rightarrow$ Interviewing $\rightarrow$ Offer).</li>
                      <li><strong>Measure Progress:</strong> Check the Analytics page to see your funnel conversion rates and skill gaps.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'pipeline' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-foreground">Pipeline Tracking</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The Dashboard is your main workspace. It acts as a Kanban board where you can see all your opportunities categorized by their current stage.
                  </p>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Drawer Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Click on any card to open its detailed drawer. Here you can:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                      <li>Change the status using the top-right dropdown.</li>
                      <li>View <strong>Skill Gap Analysis</strong> to see how your resume matches the job description.</li>
                      <li>Track a timeline of status changes under the <strong>Timeline</strong> tab.</li>
                      <li>Save recruiter contacts and personal notes.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'calendar' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-foreground">Calendar & Follow-ups</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The Calendar view helps you visualize your deadlines, interviews, and follow-ups so nothing slips through the cracks.
                  </p>
                  <ul className="space-y-3 text-sm text-muted-foreground list-disc pl-5">
                    <li><strong>Deadlines:</strong> Opportunities with upcoming deadlines are automatically plotted on the calendar.</li>
                    <li><strong>Interviews:</strong> When you change an opportunity's status to "Interviewing", it schedules it on your calendar.</li>
                    <li><strong>Google Calendar Sync:</strong> You can link your Google Calendar in Settings to have events automatically synced to Mirae.</li>
                  </ul>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-foreground">Analytics</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Turn your search into a system with data-driven insights.
                  </p>
                  <ul className="space-y-3 text-sm text-muted-foreground list-disc pl-5">
                    <li><strong>Funnel View:</strong> See how many saved jobs convert to applications, and applications to offers.</li>
                    <li><strong>Top Skills:</strong> Discover the most common skills required across all the jobs you've saved.</li>
                    <li><strong>Missing Skills:</strong> Identify the skills you frequently lack based on your uploaded resume. This helps you know what to learn next!</li>
                  </ul>
                </div>
              )}

              {activeTab === 'extension' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-foreground">Browser Extension</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The Mirae Chrome Extension is the fastest way to populate your pipeline.
                  </p>
                  <div className="rounded-xl border border-[#FCA311]/20 bg-[#FCA311]/5 p-6">
                    <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-5">
                      <li>Pin the extension to your browser toolbar.</li>
                      <li>Navigate to any job board (LinkedIn, Wellfound, Instahyre, etc.).</li>
                      <li>Click the extension icon. It will automatically extract the job title, company, description, and link!</li>
                      <li>Click "Save to Mirae" and it will instantly appear in your Dashboard under the "Saved" stage.</li>
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-foreground">Settings & Configuration</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Customize Mirae to work exactly how you want it to.
                  </p>
                  <ul className="space-y-3 text-sm text-muted-foreground list-disc pl-5">
                    <li><strong>Resume Management:</strong> Upload your PDF resume. Mirae's AI (powered by Groq) will parse it to enable Skill Gap Analysis on your job cards.</li>
                    <li><strong>Appearance:</strong> Toggle between Light and Dark mode, or set it to match your system preference.</li>
                    <li><strong>Integrations:</strong> Connect your Google Calendar or Gmail account for automated tracking.</li>
                    <li><strong>Social Portfolio:</strong> Add links to your GitHub, LinkedIn, and LeetCode profiles so they are always handy when applying.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
