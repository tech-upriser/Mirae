import { motion } from 'motion/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({ onClose, onConfirm }: Props) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[2147483647]" aria-modal="true" role="dialog" aria-labelledby="logout-modal-title">
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
          className="relative z-10 w-full max-w-[400px] rounded-md border border-[#D4AF37] bg-card shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          {/* Content */}
          <div className="p-6">
            <h2 id="logout-modal-title" className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Are you sure you want to log out?
            </h2>
            <p className="text-sm text-[#73766A] mb-6">
              You will need to sign back in to access your tracking pipeline.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 text-card-foreground font-semibold hover:text-[#FCA311] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-6 py-3 bg-[#FCA311] text-foreground rounded font-bold hover:bg-[#fdb748] transition-all shadow-md hover:shadow-lg"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
