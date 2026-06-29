import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddManualModal({ onClose, onSuccess }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<'jobs' | 'hackathons' | 'others'>('jobs');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [salary, setSalary] = useState('');
  const [skills, setSkills] = useState('');

  const sampleSkills = ['React', 'Python', 'TypeScript', 'Node.js', 'AWS'];

  const handleSubmit = async () => {
    if (!title) {
      alert("Please enter a title.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          company,
          url,
          location,
          deadline,
          salary: salary,
          category: selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1),
          description: `Manual entry. Required skills: ${skills}`,
          status: 'Saved'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save opportunity');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error saving opportunity. Is the backend running?');
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647]"
      aria-modal="true"
      role="dialog"
      aria-labelledby="add-opportunity-modal-title"
    >
      <motion.div
        id="global-overlay-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0B132B]/60"
        style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
      />

      <div className="absolute inset-0 flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex max-h-[85vh] w-full max-w-[500px] flex-col overflow-hidden rounded-xl border border-[#D4AF37] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#E5E5E5] flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="add-opportunity-modal-title" className="text-2xl font-bold text-[#000000] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Add New Opportunity
                </h2>
                <p className="text-sm text-[#73766A]">Manually enter details for your tracking pipeline</p>
              </div>
              <button
                onClick={onClose}
                className="text-[#FCA311] hover:text-[#fdb748] transition-colors p-1 flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form - Scrollable */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Primary Info Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#000000] mb-2">
                  Job/Opportunity Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Senior Frontend Engineer"
                  className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311] focus:ring-opacity-20 transition-all text-[#000000]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#000000] mb-2">
                  Company/Organization
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., GitHub"
                  className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311] focus:ring-opacity-20 transition-all text-[#000000]"
                />
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-sm font-semibold text-[#000000] mb-2">
                Category
              </label>
              <div className="flex gap-3">
                {(['jobs', 'hackathons', 'others'] as const).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`
                      px-6 py-2 rounded-full border-2 transition-all font-semibold
                      ${selectedCategory === category
                        ? 'bg-[#FCA311] border-[#FCA311] text-[#000000]'
                        : 'bg-white border-[#FCA311] text-[#FCA311] hover:bg-[#FCA311] hover:bg-opacity-10'
                      }
                    `}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Links & Location */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#000000] mb-2">
                  Application URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://company.com/careers/job-id"
                  className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311] focus:ring-opacity-20 transition-all text-[#000000]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#000000] mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Remote / San Francisco"
                    className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311] focus:ring-opacity-20 transition-all text-[#000000]"
                  />
                </div>
                <div></div>
              </div>
            </div>

            {/* Timeline & Compensation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#000000] mb-2">
                  Deadline Date
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311] focus:ring-opacity-20 transition-all text-[#000000]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#000000] mb-2">
                  Salary/Prize Range
                </label>
                <input
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="$120k - $180k"
                  className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311] focus:ring-opacity-20 transition-all text-[#000000]"
                />
              </div>
            </div>

            {/* Skill Tags Input */}
            <div>
              <label className="block text-sm font-semibold text-[#000000] mb-2">
                Required Skills
              </label>
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Type skills separated by commas (e.g., React, TypeScript, Node.js)"
                rows={3}
                className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311] focus:ring-opacity-20 transition-all text-[#000000] resize-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-[#73766A]">Suggestions:</span>
                {sampleSkills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => {
                      const currentSkills = skills ? skills.split(',').map(s => s.trim()) : [];
                      if (!currentSkills.includes(skill)) {
                        setSkills(skills ? `${skills}, ${skill}` : skill);
                      }
                    }}
                    className="px-3 py-1 bg-[#E5E5E5] text-[#14213D] rounded text-xs font-medium hover:bg-[#FCA311] hover:text-[#000000] transition-all"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#E5E5E5] flex items-center justify-between flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-3 text-[#14213D] font-semibold hover:text-[#FCA311] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-[#FCA311] text-[#000000] rounded font-bold hover:bg-[#fdb748] transition-all shadow-md hover:shadow-lg"
            >
              Add to Pipeline
            </button>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
