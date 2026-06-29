// src/app/components/LoginModal.tsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { authService } from '../services/authService';
import { useUser } from '../contexts/UserContext'; 

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    emailRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const { refetchProfile } = useUser();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setIsLoading(true);
      
      const data = await authService.login(email, password);
      
      // 🔐 SAVE THE TOKEN & USER NAME
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('isLoggedIn', 'true'); 
      
      // Refresh the global profile immediately after login
      await refetchProfile();
      
      // 🔄 SYNC WITH EXTENSION
      window.postMessage({ type: "MIRAE_SYNC_TOKEN", token: data.token }, "*");

      onClose();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
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
          <div className="flex items-start justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Login</h2>
              <p className="mt-1 text-sm text-muted-foreground">Continue to your workspace.</p>
            </div>
            <button onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form className="space-y-5 p-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email</label>
              <Input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 bg-background"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-11 bg-background"
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" className="h-11 w-full" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Login"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}

