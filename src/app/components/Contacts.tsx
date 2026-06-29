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
    return <div className="ml-60 min-h-screen bg-[#E5E5E5] p-8">Loading contacts...</div>;
  }

  return (
    <div className="ml-60 min-h-screen bg-[#E5E5E5] pb-6">
      <div className="bg-white border-b border-[#E5E5E5] sticky top-0 z-20 shadow-sm">
        <div className="px-8 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-6">
              <div className="min-w-0">
                <h1
                  className="text-3xl font-bold text-[#000000]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Recruiter CRM
                </h1>
                <p className="text-sm text-[#14213D] opacity-70">
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
            <div className="col-span-2 bg-white rounded-lg p-10 text-center border border-[#E5E5E5]">
              <p className="text-[#6b7280]">No contacts found. Mirae will automatically create contacts when it processes your emails.</p>
            </div>
          ) : (
            contacts.map((contact, i) => (
              <motion.div
                key={contact._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-white rounded-lg border border-[#E5E5E5] shadow-sm overflow-hidden flex flex-col"
              >
                <div className="p-5 border-b border-[#F1F3F5] flex justify-between items-start bg-[#F8FAFC]">
                  <div>
                    <h3 className="font-bold text-lg text-[#000000]">{contact.name}</h3>
                    <div className="text-sm font-medium text-[#14213D] flex items-center gap-2 mt-1">
                      <Briefcase className="w-3 h-3 text-[#6b7280]" />
                      {contact.role} at {contact.company}
                    </div>
                  </div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="p-2 rounded-full bg-[#E5E5E5] hover:bg-[#D5D9E2] text-[#14213D] transition-colors"
                    title="Send Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
                
                <div className="p-5 flex-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3">Linked Applications</h4>
                  <div className="space-y-2 mb-6">
                    {contact.jobIds.map(job => (
                      <div key={job._id} className="text-sm flex justify-between items-center bg-[#F1F3F5] px-3 py-2 rounded-md">
                        <span className="font-medium text-[#14213D]">{job.title}</span>
                        <span className="text-xs font-bold text-[#FCA311]">{job.status}</span>
                      </div>
                    ))}
                    {contact.jobIds.length === 0 && <span className="text-sm text-[#6b7280]">No linked applications.</span>}
                  </div>

                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3">Recent Interactions</h4>
                  <div className="space-y-3">
                    {contact.interactions.slice(0, 3).map((interaction, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="mt-0.5 text-[#6b7280]">
                          {interaction.type.includes('email') ? <Mail className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-[#14213D]">{interaction.notes || interaction.type}</div>
                          <div className="text-xs text-[#6b7280] mt-0.5">{new Date(interaction.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                    {contact.interactions.length === 0 && <span className="text-sm text-[#6b7280]">No interactions logged.</span>}
                  </div>
                </div>
                
                <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#F1F3F5] text-xs text-[#6b7280] flex items-center gap-1.5">
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
