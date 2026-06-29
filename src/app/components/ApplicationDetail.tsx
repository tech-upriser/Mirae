import { X, MapPin, Calendar, Clock, Search, BarChart3, ChevronDown, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { updateJobContacts, updateJobNotes } from '../services/dashboardService';
import { useUser } from '../contexts/UserContext';

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
  companyAcronym: string;
  imageUrl: string;
  url: string;
  location: string;
  postedDate: string;
  deadline?: string;
  salaryRange: string;
  description: string;
  skills: {
    all: string[];
    matched: string[];
    missing: string[];
  };
  history?: {
    status: string;
    date: string;
  }[];
  contacts?: {
    recruiterName: string;
    hiringManager: string;
  };
  notes?: string;
}

interface Props {
  application: Application;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: string) => void;
  onContactsSaved?: (id: string, recruiterName: string, hiringManager: string) => Promise<void> | void;
  onNotesSaved?: (id: string, notes: string) => Promise<void> | void;
}

export function ApplicationDetail({ application, onClose, onStatusChange, onContactsSaved, onNotesSaved }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const normalizeStatusValue = (value: string) => (value === 'Interviewing' ? 'Applied' : value);
  const [status, setStatus] = useState(normalizeStatusValue(application.stage || 'Saved'));
  
  // New State Variables for Networking
  const [networkContacts, setNetworkContacts] = useState<any[]>(application.networkContacts || []);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactUrl, setNewContactUrl] = useState('');
  
  const [scratchpadText, setScratchpadText] = useState(application.notes || '');
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const tabs = ['Overview', 'Timeline & Prep', 'Networking', 'Notes'];

  const { user } = useUser();



  const { skills, description = 'No description available.', location, postedDate, deadline, salaryRange, matchScore, matchPercentage, matchedSkills, missingSkills } = application;
  const finalMatchScore = matchPercentage !== undefined && matchPercentage !== null ? matchPercentage : (matchScore ?? null);
  const finalMatched = Array.isArray(matchedSkills) ? matchedSkills : (skills?.matched || []);
  const finalMissing = Array.isArray(missingSkills) ? missingSkills : (Array.isArray(skills?.missing) ? skills.missing : []);
  const finalAll = skills?.all || [];
  const normalizedPostedDate = postedDate && !/not specified|unknown/i.test(postedDate) ? postedDate : '';
  const displayDeadline = deadline
    ? new Date(deadline).toString() !== 'Invalid Date'
      ? new Date(deadline).toLocaleDateString()
      : deadline
    : 'Not provided';
  const displaySalary = salaryRange && !/not specified|unknown/i.test(salaryRange) ? salaryRange : '';

  const timelineEvents = (() => {
    const rawHistory = Array.isArray(application.history) ? application.history : [];
    const normalized = rawHistory
      .filter((event) => event?.status)
      .map((event) => ({
        status: event.status,
        date: event.date || application.appliedDate,
      }));

    if (!normalized.length) {
      return [{
        status: application.stage || 'Saved',
        date: application.appliedDate,
      }];
    }

    return [...normalized].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  })();

  const formatTimelineDate = (value?: string) => {
    if (!value) return 'Date not available';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(application.id, newStatus);
    }
  };


  useEffect(() => {
    setRecruiterName(application.contacts?.recruiterName || '');
    setNetworkContacts(application.networkContacts || []);
    setScratchpadText(application.notes || '');
    setStatus(normalizeStatusValue(application.stage || 'Saved'));
  }, [application.networkContacts, application.notes, application.stage, application.id]);

  const handleSaveContacts = async () => {
    try {
      setIsSavingContacts(true);
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/tracker/${application._id}/contacts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ networkContacts })
      });
      onContactsSaved?.(networkContacts);
    } catch (error) {
      console.error('Failed to save contacts', error);
    } finally {
      setIsSavingContacts(false);
    }
  };

  const handleAddContact = () => {
    if (!newContactName.trim()) return;
    setNetworkContacts([...networkContacts, {
      name: newContactName,
      role: newContactRole,
      url: newContactUrl,
      status: 'To Contact'
    }]);
    setNewContactName('');
    setNewContactRole('');
    setNewContactUrl('');
  };

  const handleRemoveContact = (index: number) => {
    const updated = [...networkContacts];
    updated.splice(index, 1);
    setNetworkContacts(updated);
  };


  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      if (onNotesSaved) {
        await onNotesSaved(application.id, scratchpadText);
      } else {
        await updateJobNotes(application.id, scratchpadText);
      }

      alert('Note saved successfully.');
    } catch (error) {
      console.error(error);
      alert('Failed to save note.');
    } finally {
      setIsSavingNote(false);
    }
  };



  const hasSkillAnalysis = finalAll.length > 0 || finalMatched.length > 0 || finalMissing.length > 0;
  const hasUserResumeSkills = Array.isArray(user?.resumeSkills) && user.resumeSkills.length > 0;

  return (
    <>
      {/* 1. UI & Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-screen w-[600px] bg-card shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="bg-secondary text-secondary-foreground p-6 sticky top-0 z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-secondary-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {application.role}
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-secondary-foreground/80 text-lg font-medium">{application.company}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(application.company)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md bg-card/10 p-2 text-white/80 transition-colors hover:bg-card/20 hover:text-[#FCA311]"
                    title="Search company insights on Glassdoor"
                  >
                    <Search className="h-4 w-4" />
                  </a>
                  <a
                    href={`https://www.levels.fyi/companies/${application.company.toLowerCase().replace(/[^a-z0-9]/g, '')}/salaries`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md bg-card/10 p-2 text-white/80 transition-colors hover:bg-card/20 hover:text-[#FCA311]"
                    title="Search salary data on Levels.fyi"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </a>
                </div>
              </div>
              
              {/* 3. Header Details (Dynamic Data) */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-secondary-foreground/70 font-medium">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{location || 'Location not provided'}</span>
                </div>
                {normalizedPostedDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Posted: {normalizedPostedDate}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Deadline: {displayDeadline}</span>
                </div>
                {displaySalary && (
                  <div className="flex items-center gap-1 bg-secondary-foreground/10 text-secondary-foreground px-2 py-0.5 rounded font-bold">
                    <span>{displaySalary}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 2. Status Dropdown (Actionable) */}
              <div className="relative inline-block">
                <select
                  value={status}
                  onChange={handleStatusChange}
                  className="px-4 py-2 bg-secondary-foreground text-secondary rounded-md font-bold hover:bg-secondary-foreground/90 transition-all cursor-pointer outline-none appearance-none pr-8 border-none"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer">Offered</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-secondary" />
              </div>
              
              <button onClick={onClose} className="rounded-md p-2 text-secondary-foreground/80 hover:bg-secondary-foreground/10 hover:text-secondary-foreground transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-secondary-foreground/20 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase().replace(/ & /g, '-'))}
                className={`pb-3 text-sm font-bold transition-all relative ${
                  activeTab === tab.toLowerCase().replace(/ & /g, '-')
                    ? 'text-secondary-foreground'
                    : 'text-secondary-foreground/60 hover:text-secondary-foreground'
                }`}
              >
                {tab}
                {activeTab === tab.toLowerCase().replace(/ & /g, '-') && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-foreground"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-card">
          
          {/* 4. Tab 1: Overview (Dynamic Mapping) */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex-1 min-w-0 mr-8">
                  <h3 className="text-lg font-bold text-foreground mb-3">Skill Gap Analysis</h3>

                  {!hasUserResumeSkills ? (
                    <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                      <p className="font-semibold text-red-600 mb-1">Please upload your resume to enable skill gap analysis.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">Matched Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {finalMatched.length > 0 ? (
                            finalMatched.map((skill, i) => (
                              <span key={i} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                                ✓ {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No matched skills were identified.</span>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">Missing Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {finalMissing.length > 0 ? (
                            finalMissing.map((skill: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-200">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No missing skills were identified.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-2">All Required</p>
                        <div className="flex flex-wrap gap-2">
                          {finalAll.length > 0 ? (
                            finalAll.map((skill, i) => (
                              <span key={i} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No skills were extracted for this posting.</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="56" className="stroke-muted" strokeWidth="12" fill="none" />
                    <circle
                      cx="64" cy="64" r="56" stroke="#FCA311" strokeWidth="12" fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - ((finalMatchScore ?? 0) / 100))}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Match</span>
                    <span className="text-xl font-extrabold text-[#FCA311]">{finalMatchScore !== null ? `${finalMatchScore}%` : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-foreground">Description</h3>
                </div>
                <div className="bg-muted/50 border border-border rounded-lg p-5 text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
                  {description}
                </div>
              </div>
            </motion.div>
          )}

          {/* 5. Other Tabs (Mock UI) */}
          
          {/* Timeline & Prep */}
          {activeTab === 'timeline-prep' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full">
              <h3 className="text-lg font-bold text-foreground mb-6">Application Journey</h3>

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
            </motion.div>
          )}

          {/* Networking */}
          {activeTab === 'networking' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-foreground">Networking CRM</h3>
                <a
                  href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(application.company || '')}&origin=FACETED_SEARCH`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  <Search className="h-3.5 w-3.5" />
                  {`Find People at ${application.company || 'Company'}`}
                </a>
              </div>

              <p className="text-sm text-muted-foreground mb-4">Track key contacts for this opportunity</p>
              
              <div className="flex flex-col gap-3 mb-6 max-h-[150px] overflow-y-auto pr-2">
                {networkContacts.length === 0 ? (
                  <div className="text-sm text-muted-foreground/70 italic p-4 bg-muted/20 border border-border rounded-lg text-center">
                    No contacts added yet. Build your network below!
                  </div>
                ) : (
                  networkContacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card shadow-sm">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.role}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {contact.url && (
                          <a href={contact.url.startsWith('http') ? contact.url : `https://${contact.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#FCA311] hover:underline">
                            Link
                          </a>
                        )}
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30">
                          {contact.status}
                        </span>
                        <button onClick={() => handleRemoveContact(index)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4">
                <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Add New Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name</label>
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className="w-full rounded-md border border-border p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FCA311]"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Role</label>
                    <input
                      type="text"
                      value={newContactRole}
                      onChange={(e) => setNewContactRole(e.target.value)}
                      className="w-full rounded-md border border-border p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FCA311]"
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">LinkedIn URL</label>
                    <input
                      type="text"
                      value={newContactUrl}
                      onChange={(e) => setNewContactUrl(e.target.value)}
                      className="w-full rounded-md border border-border p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FCA311]"
                      placeholder="linkedin.com/in/..."
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddContact}
                  className="w-full inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add to Network
                </button>
              </div>

              <div className="mb-4 mt-auto pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleSaveContacts}
                  disabled={isSavingContacts}
                  className="w-full inline-flex items-center justify-center rounded-md bg-secondary py-2.5 text-secondary-foreground transition-colors hover:bg-[#1f335c] disabled:opacity-60"
                >
                  {isSavingContacts ? 'Saving CRM...' : 'Save Network CRM'}
                </button>
              </div>

            </motion.div>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
              <h3 className="text-lg font-bold text-foreground mb-2 mt-4">Rich Text Scratchpad</h3>
              <textarea 
                value={scratchpadText}
                onChange={(e) => setScratchpadText(e.target.value)}
                className="flex-1 w-full border border-border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#FCA311] focus:border-transparent text-sm"
                placeholder="Write down any details, contacts, or thoughts about this application..."
              />
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="mt-4 self-end rounded-lg bg-secondary text-secondary-foreground transition-colors hover:bg-[#0B132B] disabled:opacity-60"
              >
                {isSavingNote ? 'Saving Note...' : 'Save Note'}
              </button>
            </motion.div>
          )}



        </div>
      </motion.div>
    </>
  );
}
