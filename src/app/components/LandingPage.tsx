import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, Sparkles } from 'lucide-react';
import { Navigate } from 'react-router';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { LoginModal } from './LoginModal';
import { SignupModal } from './SignupModal';
import { BrandLogo } from './BrandLogo';

const features = [
  {
    icon: Sparkles,
    title: 'Elegant Pipeline Tracking',
    description:
      'Organize roles, applications, and next steps in a polished dashboard designed for focus.',
  },
  {
    icon: CalendarDays,
    title: 'Calendar-First Follow Ups',
    description:
      'See interviews, reminders, and deadlines in one place so momentum never slips.',
  },
  {
    icon: BarChart3,
    title: 'Insightful Progress Views',
    description:
      'Turn your search into a system with visibility into outcomes, bottlenecks, and wins.',
  },
  {
    icon: CheckCircle2,
    title: 'One-Click Capture',
    description:
      'Pair the app with the browser extension to save promising opportunities the moment you find them.',
  },
];

const developers = [
  'Shreya Kumari',
  'Vennela Jangiti',
  'Hasini Nallan Chakravarthula',
  'Akshaya Boda',
  'Sasi Stuthika Adimulapu',
];

export function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const isLoggedIn = typeof window !== 'undefined' && window.localStorage.getItem('isLoggedIn') === 'true';

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden bg-secondary text-secondary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.primary/.22),transparent_34%),radial-gradient(circle_at_80%_20%,theme(colors.card/.1),transparent_28%),radial-gradient(circle_at_bottom_right,theme(colors.primary/.14),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-primary/30" />
        <div className="absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <section className="relative flex min-h-screen items-center justify-center px-6 py-16 sm:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/25 bg-card px-4 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
              <BrandLogo className="h-10 w-10 sm:h-12 sm:w-12" />
              <div className="text-left">
                <div
                  className="text-lg font-bold leading-none text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Mirae
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Career Command Center
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="max-w-4xl"
            >
              <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Track every opportunity with clarity, rhythm, and calm.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-secondary-foreground/78 sm:text-lg">
                Mirae brings your applications, follow-ups, resumes, analytics, and extension workflow
                into one refined space built to help you stay consistent.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mt-10 flex w-full max-w-xl flex-col items-stretch justify-center gap-4 sm:flex-row sm:flex-wrap"
            >
              <Button
                size="lg"
                className="min-w-[170px] flex-1 shadow-[0_14px_30px_rgba(0,0,0,0.22)] sm:flex-none"
                onClick={() => setShowSignup(true)}
              >
                Sign Up
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-[170px] flex-1 border-primary/35 bg-card text-foreground shadow-[0_14px_30px_rgba(0,0,0,0.14)] hover:bg-card sm:flex-none"
                onClick={() => setShowLogin(true)}
              >
                Login
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="min-w-[170px] flex-1 border border-primary/20 shadow-[0_14px_30px_rgba(0,0,0,0.22)] sm:flex-none"
                asChild
              >
                <a
                  href="https://chrome.google.com/webstore"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Add Extension
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.14 }}
              className="mt-6 text-sm text-secondary-foreground/68"
            >
              Seamless extension capture, elegant tracking, and a dashboard that keeps your search moving.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-16 w-full max-w-5xl rounded-2xl border border-border bg-card p-2 shadow-2xl"
            >
              <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted flex items-center justify-center text-muted-foreground border border-border">
                <span className="font-medium text-lg">[Hero Dashboard Screenshot Placeholder (Light/Dark)]</span>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      <section className="border-t border-border bg-background px-6 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Everything you need to run a thoughtful search.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Built with the same visual language as the product: crisp cards, strong hierarchy, and
              practical workflows that stay out of your way.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card
                  key={feature.title}
                  className="border-border bg-card shadow-[0_16px_36px_rgba(0,0,0,0.08)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <CardHeader className="gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-bold text-card-foreground">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-6">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-px w-full bg-border" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/5 px-6 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-32">
          
          {/* Feature 1 */}
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-4">Elegant Pipeline Tracking</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Organize roles, applications, and next steps in a polished dashboard designed for focus. Move away from chaotic spreadsheets and manage your career with clarity.
              </p>
            </div>
            <div className="aspect-[4/3] rounded-2xl border border-border bg-muted flex items-center justify-center shadow-lg text-muted-foreground">
              <span className="font-medium px-4 text-center">[Kanban Dashboard Screenshot Placeholder (Light/Dark)]</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid gap-12 md:grid-cols-2 items-center md:flex-row-reverse">
            <div className="aspect-[4/3] rounded-2xl border border-border bg-muted flex items-center justify-center shadow-lg text-muted-foreground md:order-1">
              <span className="font-medium px-4 text-center">[Analytics Funnel & KPIs Screenshot Placeholder (Light/Dark)]</span>
            </div>
            <div className="md:order-2">
              <h3 className="text-3xl font-bold text-foreground mb-4">Actionable Analytics</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Turn your search into a system with visibility into outcomes, bottlenecks, and wins. Track your conversion rates and optimize your applications.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-4">One-Click Extension Capture</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Pair the app with the browser extension to save promising opportunities the moment you find them. Instantly extracts titles, companies, and job descriptions from any site.
              </p>
            </div>
            <div className="aspect-[4/3] rounded-2xl border border-border bg-muted flex items-center justify-center shadow-lg text-muted-foreground">
              <span className="font-medium px-4 text-center">[Chrome Extension Screenshot Placeholder (Light/Dark)]</span>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="grid gap-12 md:grid-cols-2 items-center md:flex-row-reverse">
            <div className="aspect-[4/3] rounded-2xl border border-border bg-muted flex items-center justify-center shadow-lg text-muted-foreground md:order-1">
              <span className="font-medium px-4 text-center">[Match Percentage & Skill Gap Screenshot Placeholder (Light/Dark)]</span>
            </div>
            <div className="md:order-2">
              <h3 className="text-3xl font-bold text-foreground mb-4">Intelligent Resume Parsing</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Upload your resume once. Our AI will automatically analyze your skills against every job description to provide a Match Score and identify exactly what skills you're missing.
              </p>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-4">Master Your Schedule</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Sync your Google Calendar to view upcoming interviews and deadlines directly within Mirae. Keep track of all your follow-ups in a beautiful calendar view.
              </p>
            </div>
            <div className="aspect-[4/3] rounded-2xl border border-border bg-muted flex items-center justify-center shadow-lg text-muted-foreground">
              <span className="font-medium px-4 text-center">[Calendar Page Screenshot Placeholder (Light/Dark)]</span>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="grid gap-12 md:grid-cols-2 items-center md:flex-row-reverse">
            <div className="aspect-[4/3] rounded-2xl border border-border bg-muted flex items-center justify-center shadow-lg text-muted-foreground md:order-1">
              <span className="font-medium px-4 text-center">[Settings & Integrations Screenshot Placeholder (Light/Dark)]</span>
            </div>
            <div className="md:order-2">
              <h3 className="text-3xl font-bold text-foreground mb-4">Powerful Integrations</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Connect Gmail and Calendar in Settings to enable one-click email capture and seamless interview scheduling. Customize your dark mode and notifications.
              </p>
            </div>
          </div>

          {/* Feature 7 */}
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-4">Comprehensive User Guide</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                New to Mirae? Access our built-in community and help guide anytime from the settings menu to master your workflows and get the most out of our extension.
              </p>
            </div>
            <div className="aspect-[4/3] rounded-2xl border border-border bg-muted flex items-center justify-center shadow-lg text-muted-foreground">
              <span className="font-medium px-4 text-center">[User Guide Modal Screenshot Placeholder (Light/Dark)]</span>
            </div>
          </div>

        </div>
      </section>

      <section className="border-t border-border bg-background px-6 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-foreground mb-6">Ready to take control of your career?</h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join Mirae today and bring clarity, rhythm, and calm to your job search and professional networking.
          </p>
          <Button
            size="lg"
            className="min-w-[200px] shadow-[0_14px_30px_rgba(0,0,0,0.22)]"
            onClick={() => setShowSignup(true)}
          >
            Get Started for Free
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/5 px-6 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true, amount: 0.25 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Meet the Developers
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Meet the team behind Mirae
            </p>
          </motion.div>

          <div className="mt-10 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {developers.map((developer, index) => (
              <motion.div
                key={developer}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                viewport={{ once: true, amount: 0.2 }}
                className="rounded-2xl border border-border bg-background p-6 text-center shadow-[0_12px_28px_rgba(0,0,0,0.08)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_18px_36px_rgba(0,0,0,0.12)] dark:bg-card"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-bold text-foreground">
                  {developer
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{developer}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Mirae Developer</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-secondary px-6 py-8 text-secondary-foreground sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-secondary-foreground/72 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-8 w-8" />
            <span className="text-secondary-foreground">Mirae</span>
          </div>
          <span>Designed to keep your opportunity pipeline focused and organized.</span>
        </div>
      </footer>

      <AnimatePresence>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
      </AnimatePresence>
    </div>
  );
}
