const cron = require('node-cron');
const Job = require('../models/Job');
const CalendarEvent = require('../models/CalendarEvent');
const User = require('../models/User');
const { upsertMiraeEventToGoogle } = require('../controllers/googleCalendarController');
const socket = require('../utils/socket');

const checkFollowUps = async () => {
  console.log('⏰ Running server-side follow-up reminder check...');
  try {
    // Find all jobs that have been in "Interviewing" for over 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const interviewingJobs = await Job.find({
      status: 'Interviewing',
      updatedAt: { $lt: sevenDaysAgo }
    });

    for (const job of interviewingJobs) {
      // Check if we already created a follow-up reminder for this job
      const existingReminder = await CalendarEvent.findOne({
        sourceId: job._id.toString(),
        type: 'follow-up'
      });

      if (!existingReminder) {
        // Create a new follow-up reminder
        const calEvent = new CalendarEvent({
          userId: job.userId,
          title: `Follow-up: ${job.company} — ${job.title}`,
          description: `It has been 7 days since your last update for the ${job.title} position at ${job.company}.\nConsider sending a follow-up email.`,
          date: new Date(), // Today
          startTime: '09:00 AM',
          type: 'follow-up',
          source: 'dashboard',
          sourceId: job._id.toString()
        });
        await calEvent.save();

        const user = await User.findById(job.userId);
        if (user && user.googleRefreshToken) {
          await upsertMiraeEventToGoogle(user._id, calEvent);
        }
        
        console.log(`⏰ Created follow-up reminder for ${job.company}`);

        // Notify client in real-time if connected
        try {
          socket.getIO().to(job.userId.toString()).emit('status_update', {
            jobId: job._id,
            company: job.company,
            title: job.title,
            newStatus: 'Reminder Created',
            category: 'Follow-up'
          });
        } catch (err) {
          // Socket might not be connected
        }
      }
    }
  } catch (error) {
    console.error('Failed to run follow-up check:', error);
  }
};

const init = () => {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', checkFollowUps);
  console.log('⏰ Reminder Service initialized.');
};

module.exports = { init, checkFollowUps };
