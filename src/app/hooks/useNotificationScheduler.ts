import { useEffect } from 'react';
import { getSettings } from '../services/settingsService';
import { trackerService } from '../services/trackerService';

type ReminderJob = {
  _id: string;
  title?: string;
  company?: string;
  deadline?: string | null;
  status?: string;
  createdAt?: string;
};

const SCAN_INTERVAL_MS = 60 * 1000;
const KEY_PREFIX = 'mirae_notified';

const getTimingMs = (timing: '1day' | '3days' | 'custom', customHours: number) => {
  if (timing === '1day') return 24 * 60 * 60 * 1000;
  if (timing === '3days') return 3 * 24 * 60 * 60 * 1000;
  return Math.max(1, customHours || 1) * 60 * 60 * 1000;
};

const notificationKey = (jobId: string, type: string) => `${KEY_PREFIX}:${jobId}:${type}`;

const wasSent = (jobId: string, type: string) => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(notificationKey(jobId, type)) === '1';
};

const markSent = (jobId: string, type: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(notificationKey(jobId, type), '1');
};

const maybeNotify = ({
  jobId,
  type,
  dueAt,
  now,
  title,
  body
}: {
  jobId: string;
  type: string;
  dueAt: number;
  now: number;
  title: string;
  body: string;
}) => {
  if (!Number.isFinite(dueAt)) return;
  if (wasSent(jobId, type)) return;
  if (dueAt > now) return;
  if (now - dueAt > SCAN_INTERVAL_MS * 5) return;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
  markSent(jobId, type);
};

export function useNotificationScheduler() {
  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (!active || typeof window === 'undefined') return;
      const isLoggedIn = window.localStorage.getItem('isLoggedIn') === 'true';
      if (!isLoggedIn) return;

      try {
        const settings = await getSettings();
        const notifications = settings.notifications;
        if (!notifications.notificationsEnabled || !notifications.remindersEnabled || !notifications.browserNotifications) {
          return;
        }

        const jobs = await trackerService.getAllJobs() as ReminderJob[];
        const now = Date.now();
        const offset = getTimingMs(notifications.notificationTiming, notifications.customReminderHours);

        jobs.forEach((job) => {
          const jobId = job._id;
          const jobTitle = job.title || 'Opportunity';
          const company = job.company || 'Company';

          if (notifications.followUpReminders && job.createdAt) {
            const followUpAt = new Date(job.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000;
            maybeNotify({
              jobId,
              type: 'followup',
              dueAt: followUpAt,
              now,
              title: 'Follow-up Reminder',
              body: `Follow up for ${jobTitle} at ${company}.`
            });
          }

          if (job.deadline) {
            const deadline = new Date(job.deadline).getTime();
            if (notifications.deadlineAlerts) {
              maybeNotify({
                jobId,
                type: 'deadline',
                dueAt: deadline - offset,
                now,
                title: 'Deadline Alert',
                body: `${jobTitle} at ${company} has an upcoming deadline.`
              });
            }

            if (notifications.interviewReminders && job.status === 'Interviewing') {
              maybeNotify({
                jobId,
                type: 'interview',
                dueAt: deadline - offset,
                now,
                title: 'Interview Reminder',
                body: `${jobTitle} at ${company} interview timeline is approaching.`
              });
            }
          }
        });
      } catch {
        // Ignore scheduler errors so app UX stays smooth.
      }
    };

    void tick();
    const intervalId = window.setInterval(() => {
      void tick();
    }, SCAN_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);
}
