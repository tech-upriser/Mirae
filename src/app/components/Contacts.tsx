import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Briefcase, Clock, FileText } from 'lucide-react';
import { getContacts } from '../services/contactService';

type Interaction = {
  type: string;
  date: string;
  notes?: string;
};

type Contact = {
  _id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  jobIds: { _id: string; title: string; company: string; status: string }[];
  interactions: Interaction[];
  lastContactDate: string;
};

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await getContacts();
        setContacts(data);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  if (loading) {
    return <div className="ml-60 min-h-screen bg-background p-8">Loading contacts...</div>;
  }

  return (
    <div className="ml-60 min-h-screen bg-background pb-6">
      <div className="bg-card border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="px-8 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-6">
              <div className="min-w-0">
                <h1
                  className="text-3xl font-bold text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Recruiter CRM
                </h1>
                <p className="text-sm text-card-foreground opacity-70">
                  Manage your interactions with recruiters, hiring managers, and interviewers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pt-6">
        <div className="grid grid-cols-2 gap-6">
          {contacts.length === 0 ? (
            <div className="col-span-2 bg-card rounded-lg p-10 text-center border border-border">
              <p className="text-muted-foreground">No contacts found. Mirae will automatically create contacts when it processes your emails.</p>
            </div>
          ) : (
            contacts.map((contact, i) => (
              <motion.div
                key={contact._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-card rounded-lg border border-border shadow-sm overflow-hidden flex flex-col"
              >
                <div className="p-5 border-b border-[#F1F3F5] flex justify-between items-start bg-[#F8FAFC]">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{contact.name}</h3>
                    <div className="text-sm font-medium text-card-foreground flex items-center gap-2 mt-1">
                      <Briefcase className="w-3 h-3 text-muted-foreground" />
                      {contact.role} at {contact.company}
                    </div>
                  </div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="p-2 rounded-full bg-background hover:bg-[#D5D9E2] text-card-foreground transition-colors"
                    title="Send Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
                
                <div className="p-5 flex-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Linked Applications</h4>
                  <div className="space-y-2 mb-6">
                    {contact.jobIds.map(job => (
                      <div key={job._id} className="text-sm flex justify-between items-center bg-[#F1F3F5] px-3 py-2 rounded-md">
                        <span className="font-medium text-card-foreground">{job.title}</span>
                        <span className="text-xs font-bold text-[#FCA311]">{job.status}</span>
                      </div>
                    ))}
                    {contact.jobIds.length === 0 && <span className="text-sm text-muted-foreground">No linked applications.</span>}
                  </div>

                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Interactions</h4>
                  <div className="space-y-3">
                    {contact.interactions.slice(0, 3).map((interaction, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="mt-0.5 text-muted-foreground">
                          {interaction.type.includes('email') ? <Mail className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-card-foreground">{interaction.notes || interaction.type}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{new Date(interaction.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                    {contact.interactions.length === 0 && <span className="text-sm text-muted-foreground">No interactions logged.</span>}
                  </div>
                </div>
                
                <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#F1F3F5] text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Last contacted: {new Date(contact.lastContactDate).toLocaleDateString()}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
