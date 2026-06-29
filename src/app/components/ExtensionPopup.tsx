import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { BrandLogo } from './BrandLogo';
// 1. Import the service we just built! (Adjust the path if needed based on your folder structure)
import { trackerService } from '../services/trackerService'; 

interface Props {
  onClose?: () => void;
  // Optional: A function to tell the parent dashboard to refresh the job list after saving
  onJobSaved?: () => void; 
}

export function ExtensionPopup({ onClose, onJobSaved }: Props) {
  const [selectedType, setSelectedType] = useState<'job' | 'hackathon' | 'contest'>('job');
  const [role, setRole] = useState('Senior Backend Engineer');
  const [company, setCompany] = useState('Stripe');
  
  // 2. Add a loading state for the button
  const [isSaving, setIsSaving] = useState(false);

  // Hardcoded for now (In the future, you could call Gemini here too!)
  const detectedSkills = ['Node.js', 'MongoDB', 'GraphQL'];

  // 3. The magic function that talks to your backend
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Map the form state to the Job interface we created
      await trackerService.createJob({
        title: role,
        company: company,
        url: 'Manual Entry', // Since there's no URL input, we provide a fallback
        category: selectedType === 'contest' ? 'Others' : selectedType === 'job' ? 'Jobs' : 'Hackathons',
        status: 'Saved',
        matchScore: 92, // Using the hardcoded UI value for now
        matchedSkills: detectedSkills
      });

      alert('✨ Job successfully saved to Mirae!');
      
      // Tell the dashboard to refresh, then close the modal
      if (onJobSaved) onJobSaved();
      if (onClose) onClose();
    } catch (error) {
      console.error("Failed to save:", error);
      const anyError = error as any;
      if (anyError?.code === 'DUPLICATE_JOB') {
        alert(`Duplicate detected: ${anyError?.duplicate?.title || role} at ${anyError?.duplicate?.company || company} already exists.`);
      } else {
        alert('Failed to save the job. Make sure your backend is running!');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[10000] p-4"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-[360px] bg-white rounded-md shadow-2xl overflow-hidden border border-[#E5E5E5]"
      >
        {/* Header (Unchanged) */}
        <div className="bg-[#14213D] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-10 w-10 flex-shrink-0" />
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-[#FCA311]">Mirae</span>
            </h1>
            <div className="w-2 h-2 rounded-full bg-[#FCA311] animate-pulse"></div>
          </div>
          <button onClick={onClose} className="text-white hover:text-[#FCA311] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Elements (Unchanged) */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#14213D] mb-2">Role Title</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FCA311] bg-white text-[#000000] font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#14213D] mb-2">Company Name</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FCA311] bg-white text-[#14213D]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#14213D] mb-2">Application Type</label>
            <div className="flex gap-2 bg-[#E5E5E5] p-1 rounded-md">
              {(['job', 'hackathon', 'contest'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                    selectedType === type ? 'bg-white text-[#000000] shadow-md' : 'text-[#14213D] hover:text-[#000000]'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Analysis UI (Unchanged) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-[#E5E5E5] bg-opacity-50 rounded-md p-4"
          >
            <h3 className="text-sm font-semibold text-[#14213D] mb-3">Detected Insights</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="42" stroke="#E5E5E5" strokeWidth="8" fill="none" />
                  <circle cx="48" cy="48" r="42" stroke="#FCA311" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - 0.92)}`} className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-[#FCA311]" style={{ fontFamily: 'var(--font-display)' }}>92%</span>
                  <span className="text-[10px] text-[#14213D]">Match</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {detectedSkills.map((skill, index) => (
                <motion.span key={skill} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }} className="px-3 py-1.5 bg-[#14213D] text-white rounded-full text-xs font-medium">
                  {skill}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 space-y-3">
          {/* 4. Wire up the onClick handler and dynamic text */}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-3 rounded-md font-bold text-base transition-all shadow-md 
              ${isSaving ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#FCA311] text-[#000000] hover:bg-[#fdb748] hover:shadow-lg'}`}
          >
            {isSaving ? 'Saving...' : 'Save to Dashboard'}
          </button>
          
          <button onClick={onClose} className="w-full text-sm text-[#14213D] hover:text-[#FCA311] transition-colors font-medium">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

