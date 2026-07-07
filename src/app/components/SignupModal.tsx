// src/app/components/SignupModal.tsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { authService } from '../services/authService';
import { useUser } from '../contexts/UserContext'; 

interface SignupModalProps {
  onClose: () => void;
}

type Stage = 'details' | 'otp';

export function SignupModal({ onClose }: SignupModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nameRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Focus OTP input when transitioning to OTP stage
  useEffect(() => {
    if (stage === 'otp') {
      setTimeout(() => otpRef.current?.focus(), 100);
    }
  }, [stage]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const { refetchProfile } = useUser();

  // ── Stage 1: Send OTP ────────────────────────────────────────────────────
  const handleSendOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill out all fields.');
      return;
    }

    // Client-side Gmail validation
    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      setError('Only @gmail.com addresses are allowed.');
      return;
    }

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      await authService.sendOtp(email.trim());
      setStage('otp');
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Stage 2: Verify OTP & Register ────────────────────────────────────────
  const handleVerifyAndRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setIsLoading(true);
      const data = await authService.register(name, email, password, otp.trim());

      // 🔐 SAVE THE TOKEN & USER NAME
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('isLoggedIn', 'true');

      // Refresh the global profile immediately after signup
      await refetchProfile();

      // 🔄 SYNC WITH EXTENSION
      window.postMessage({ type: "MIRAE_SYNC_TOKEN", token: data.token }, "*");

      onClose();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');

    try {
      setIsLoading(true);
      await authService.sendOtp(email.trim());
      setResendCooldown(30);
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483647]" aria-modal="true" role="dialog">
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-secondary/60 backdrop-blur-[40px]"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          onClick={(event) => event.stopPropagation()}
          className="relative w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between border-b border-border px-6 py-5">
            <div className="flex items-center gap-3">
              {stage === 'otp' && (
                <button
                  onClick={() => { setStage('details'); setError(''); setOtp(''); }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  {stage === 'details' ? (
                    <>Sign Up</>
                  ) : (
                    <>
                      <ShieldCheck className="h-7 w-7 text-primary" />
                      Verify Email
                    </>
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stage === 'details'
                    ? 'Start tracking your career path.'
                    : (
                      <>
                        Code sent to <span className="font-medium text-foreground">{email}</span>
                      </>
                    )
                  }
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {stage === 'details' ? (
              <motion.form
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 p-6"
                onSubmit={handleSendOtp}
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Full Name</label>
                  <Input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="h-11 bg-background"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Gmail Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@gmail.com"
                      className="h-11 bg-background pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Only @gmail.com addresses are supported.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min 6 chars)"
                    className="h-11 bg-background"
                    disabled={isLoading}
                  />
                </div>

                {error && <p className="text-sm font-medium text-destructive">{error}</p>}

                <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Code...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 p-6"
                onSubmit={handleVerifyAndRegister}
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Verification Code</label>
                  <Input
                    ref={otpRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="h-14 bg-background text-center text-2xl font-bold tracking-[0.5em]"
                    disabled={isLoading}
                    autoComplete="one-time-code"
                  />
                  <p className="text-xs text-muted-foreground">
                    Check your inbox for the verification code. It expires in 5 minutes.
                  </p>
                </div>

                {error && <p className="text-sm font-medium text-destructive">{error}</p>}

                <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : 'Resend code'
                    }
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
