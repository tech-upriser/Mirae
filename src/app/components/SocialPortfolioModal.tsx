import { X, Plus, Edit2, Trash2, ExternalLink, Linkedin, Github, Globe, Dribbble, Twitter, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { authService } from '../services/authService';

interface Props {
  onClose: () => void;
}

interface SocialLink {
  id: string;
  platform: string;
  title: string;
  url: string;
  icon: 'linkedin' | 'github' | 'website' | 'behance' | 'dribbble' | 'twitter' | 'instagram';
}

const platformIcons = {
  linkedin: Linkedin,
  github: Github,
  website: Globe,
  behance: Globe,
  dribbble: Dribbble,
  twitter: Twitter,
  instagram: Instagram,
};

export function SocialPortfolioModal({ onClose }: Props) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleAddLink = async () => {
    if (newPlatform && newUrl) {
      const newLink: SocialLink = {
        id: Date.now().toString(),
        platform: newPlatform,
        title: newPlatform,
        url: newUrl,
        icon: 'website',
      };
      
      const updatedLinks = [...links, newLink];
      setLinks(updatedLinks);
      setNewPlatform('');
      setNewUrl('');
      setShowAddForm(false);
      
      try {
        await authService.updateSocialLinks(updatedLinks);
      } catch (error) {
        console.error("Failed to save link", error);
      }
    }
  };

  const handleDeleteLink = async (id: string) => {
    const updatedLinks = links.filter(link => link.id !== id);
    setLinks(updatedLinks);
    try {
      await authService.updateSocialLinks(updatedLinks);
    } catch (error) {
      console.error("Failed to delete link", error);
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const loadProfileLinks = async () => {
      try {
        const profile = await authService.getProfile();
        if (profile.socialLinks) {
          setLinks(profile.socialLinks);
        }
      } catch (error) {
        console.error("Failed to load links", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfileLinks();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[2147483647]" aria-modal="true" role="dialog" aria-labelledby="social-portfolio-modal-title">
      <motion.div
        id="global-overlay-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0B132B]/65"
        style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
      />

      <div className="absolute inset-0 flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex max-h-[85vh] w-full max-w-[700px] flex-col overflow-hidden rounded-md border border-[#D4AF37] bg-card shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
            <div>
              <h2
                id="social-portfolio-modal-title"
                className="text-3xl font-bold text-card-foreground mb-1"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Your Online Portfolio
              </h2>
              <p className="text-sm text-card-foreground/50" style={{ fontFamily: 'Outfit' }}>
                Showcase your professional presence across platforms
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#FCA311] hover:text-[#fdb748] transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 rounded-full border-4 border-border border-t-[#FCA311] animate-spin"></div>
              </div>
            ) : (
              <>
            {/* Links List */}
            <div className="space-y-3 mb-6">
              {links.map((link, index) => {
                const IconComponent = platformIcons[link.icon];
                return (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="group relative bg-card border border-border rounded-lg p-5 hover:border-[#FCA311] hover:shadow-lg transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(252, 163, 17, 0.02) 0%, rgba(255, 255, 255, 1) 100%)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Platform Icon */}
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FCA311] to-[#fdb748] rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>

                      {/* Link Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-card-foreground" style={{ fontFamily: 'Outfit' }}>
                            {link.platform}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-[#FCA311]/10 text-[#FCA311] rounded-full font-medium">
                            {link.title}
                          </span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-card-foreground/60 hover:text-[#FCA311] transition-colors flex items-center gap-1 truncate"
                          style={{ fontFamily: 'Outfit' }}
                        >
                          {link.url}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          className="p-2 hover:bg-[#FCA311]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-card-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-[#E11D48]" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Add New Link Section */}
            <AnimatePresence mode="wait">
              {!showAddForm ? (
                <motion.button
                  key="add-button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-4 border-2 border-dashed border-[#3B82F6] rounded-lg text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-all flex items-center justify-center gap-2 font-semibold group"
                  style={{ fontFamily: 'Outfit' }}
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Add New Link
                </motion.button>
              ) : (
                <motion.div
                  key="add-form"
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="border-2 border-[#3B82F6] rounded-lg p-5 bg-[#3B82F6]/5 overflow-hidden"
                >
                  <h3 className="text-lg font-semibold text-card-foreground mb-4" style={{ fontFamily: 'Outfit' }}>
                    Add New Link
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2" style={{ fontFamily: 'Outfit' }}>
                        Platform / Title
                      </label>
                      <input
                        type="text"
                        value={newPlatform}
                        onChange={(e) => setNewPlatform(e.target.value)}
                        placeholder="e.g., LinkedIn, GitHub, Behance"
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all text-card-foreground"
                        style={{ fontFamily: 'Outfit' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2" style={{ fontFamily: 'Outfit' }}>
                        Link URL
                      </label>
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all text-card-foreground"
                        style={{ fontFamily: 'Outfit' }}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddLink}
                        className="flex-1 px-6 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-all font-semibold shadow-md"
                        style={{ fontFamily: 'Outfit' }}
                      >
                        Save Link
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowAddForm(false);
                          setNewPlatform('');
                          setNewUrl('');
                        }}
                        className="px-6 py-3 border-2 border-border text-card-foreground rounded-lg hover:bg-background transition-all font-semibold"
                        style={{ fontFamily: 'Outfit' }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </>
            )}
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
