import { X, Upload, Star, Trash2, File, FileText, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { authService } from '../services/authService';

interface Props {
  onClose: () => void;
}

interface ResumeInfo {
  fileName: string;
  uploadedAt: string;
  charCount: number;
}

export function ManageResumesModal({ onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load current resume info from the backend on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await authService.getProfile();
        if (profile.resumeFileName || profile.resumeText) {
          setResumeInfo({
            fileName: profile.resumeFileName || 'Resume',
            uploadedAt: profile.resumeUploadedAt
              ? new Date(profile.resumeUploadedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })
              : 'Unknown date',
            charCount: profile.resumeText.length,
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Handle file upload — sends the actual file to the backend for parsing
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type on the frontend too
    const validTypes = ['application/pdf', 'text/plain'];
    const validExtensions = ['.pdf', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setError('Please upload a .pdf or .txt file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      // Send the actual file to the backend — it handles PDF parsing
      const result = await authService.uploadResumeFile(file);

      setResumeInfo({
        fileName: result.stats.fileName,
        uploadedAt: new Date(result.stats.uploadedAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        }),
        charCount: result.stats.charCount,
      });

      setError('');

    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "Failed to upload resume. Is your backend running?");
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your resume? This will disable Match Scoring.')) return;

    try {
      await authService.deleteResume();
      setResumeInfo(null);
      setError('');
    } catch (err: any) {
      setError(err.message || "Failed to delete resume.");
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[2147483647]" aria-modal="true" role="dialog">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0B132B]/65 backdrop-blur-[40px]"
      />

      <div className="absolute inset-0 flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex max-h-[85vh] w-full max-w-[700px] flex-col overflow-hidden rounded-md border border-[#D4AF37] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] p-6">
            <h2 className="text-2xl font-bold text-[#000000]">Manage Resumes</h2>
            <button onClick={onClose} className="p-1 text-[#FCA311] hover:text-[#fdb748]">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Upload Area */}
            <div className="mb-8">
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors 
                  ${isUploading ? 'border-gray-300 bg-gray-50' : 'border-[#E5E5E5] hover:border-[#FCA311]'}`}
              >
                <Upload className={`mx-auto mb-3 h-8 w-8 ${isUploading ? 'animate-bounce text-gray-400' : 'text-[#14213D]'}`} />
                
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".txt,.pdf,.md,application/pdf,text/plain" 
                  onChange={handleFileChange}
                />

                <button className="mb-2 rounded bg-[#FCA311] px-6 py-2 font-semibold text-[#000000] transition-all hover:bg-[#fdb748]">
                  {isUploading ? 'Parsing & Uploading...' : 'Upload Resume'}
                </button>
                <p className="text-xs text-[#73766A]">
                  Supports <strong>.pdf</strong> and <strong>.txt</strong> files (max 5MB). We extract the text and use it for Match Scoring.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                ❌ {error}
              </div>
            )}

            {/* Resume List */}
            <div className="space-y-3">
              <h3 className="mb-3 text-sm font-semibold text-[#14213D]">Your Resume</h3>
              
              {loading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
              ) : resumeInfo ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-md border border-[#E5E5E5] p-4 hover:border-[#FCA311]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-[#FFF3D6]">
                      {resumeInfo.fileName.endsWith('.pdf') ? (
                        <FileText className="h-5 w-5 text-[#FCA311]" />
                      ) : (
                        <File className="h-5 w-5 text-[#14213D]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 truncate font-semibold text-[#000000]">{resumeInfo.fileName}</div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#14213D] px-2 py-1 text-xs text-white">
                          Scoring Active
                        </span>
                        <span className="text-xs text-[#73766A]">{resumeInfo.uploadedAt}</span>
                        <span className="text-xs text-[#73766A]">•</span>
                        <span className="text-xs text-[#73766A]">{resumeInfo.charCount.toLocaleString()} chars</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 fill-green-500 text-white" />
                      <button onClick={handleDelete} className="rounded p-2 hover:bg-[#E5E5E5]">
                        <Trash2 className="h-4 w-4 text-[#E11D48]" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="rounded-md border border-dashed border-[#E5E5E5] py-8 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">No resume uploaded yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Upload a resume to enable Match Scoring on saved jobs.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
