const CalendarEvent = require('../models/CalendarEvent');
const Job = require('../models/Job');
const googleCalendarController = require('./googleCalendarController');

const getDashboardCalendarEventId = (jobId) => `dashboard-job-${jobId}`;

const hasMeaningfulValue = (value) => {
  const text = String(value || '').trim();
  return Boolean(text) && !/^(not specified|unknown|n\/a|na|none|null|undefined)$/i.test(text);
};

const getDashboardReminderTitle = (job) => {
  const company = hasMeaningfulValue(job.company) ? job.company.trim() : '';
  const title = hasMeaningfulValue(job.title) ? job.title.trim() : '';
  const category = hasMeaningfulValue(job.category) ? job.category.trim() : 'Opportunity';

  if (company && title) return `${company} - ${title}`;
  if (title) return title;
  if (company) return `${company} ${category} deadline`;
  return `${category} deadline`;
};

const isValidDeadline = (value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const getAuthenticatedUserId = (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Not authorized, user context missing' });
    return null;
  }
  return String(userId);
};

const buildDashboardReminder = (job, userId) => {
  const title = getDashboardReminderTitle(job);
  
  // Support Job, Hackathon, and Others statuses
  const isInterviewLike = ['Interviewing', 'Participated', 'Active'].includes(job.status);
  const isCompleted = ['Offer', 'Offered', 'Rejected', 'Won', 'Completed', 'Lost'].includes(job.status);
  
  const type = isInterviewLike ? 'interview' : 'deadline';
  const details = [
    hasMeaningfulValue(job.title) ? `Role: ${job.title}` : '',
    hasMeaningfulValue(job.company) ? `Company: ${job.company}` : '',
    hasMeaningfulValue(job.url) ? `Link: ${job.url}` : '',
  ].filter(Boolean);

  return {
    title,
    description: details.length ? details.join('\n') : 'Dashboard opportunity deadline.',
    date: job.deadline,
    startTime: type === 'interview' ? '09:00 AM' : '',
    endTime: type === 'interview' ? '10:00 AM' : '11:59 PM',
    type,
    status: isCompleted ? 'completed' : 'pending',
    location: hasMeaningfulValue(job.location) ? job.location : '',
    applyLink: hasMeaningfulValue(job.url) ? job.url : '',
    userId,
    source: 'dashboard',
    sourceId: getDashboardCalendarEventId(job._id),
  };
};

exports.getAllEvents = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const events = await CalendarEvent.find({ userId }).sort({ date: 1 });
    res.status(200).json({ events });
  } catch (error) {
    console.error('Calendar getAllEvents error:', error.message);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
};

exports.syncDashboardReminders = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const jobsWithDeadlines = await Job.find({
      userId,
      deadline: { $ne: null },
    });

    const syncedEvents = [];
    const activeSourceIds = [];
    let exportedToGoogleCount = 0;

    for (const job of jobsWithDeadlines) {
      if (!isValidDeadline(job.deadline)) {
        continue;
      }

      const reminder = buildDashboardReminder(job, userId);
      activeSourceIds.push(reminder.sourceId);
      const calendarEvent = await CalendarEvent.findOneAndUpdate(
        { userId, source: 'dashboard', sourceId: reminder.sourceId },
        { $set: reminder },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      syncedEvents.push(calendarEvent);

      try {
        const googleEvent = await googleCalendarController.upsertMiraeEventToGoogle(userId, calendarEvent);
        if (googleEvent) exportedToGoogleCount += 1;
      } catch (googleError) {
        console.error('Dashboard reminder Google auto-sync error:', googleError.message);
      }
    }

    await CalendarEvent.deleteMany({
      userId,
      source: 'dashboard',
      sourceId: { $nin: activeSourceIds },
    });

    res.status(200).json({
      message: 'Dashboard reminders synced to calendar',
      syncedCount: syncedEvents.length,
      exportedToGoogleCount,
      events: syncedEvents,
    });
  } catch (error) {
    console.error('Dashboard reminder sync error:', error.message);
    res.status(500).json({ error: 'Failed to sync dashboard reminders' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const event = await CalendarEvent.findOne({ _id: req.params.id, userId });
    if (!event) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }
    res.status(200).json({ event });
  } catch (error) {
    console.error('Calendar getEventById error:', error.message);
    res.status(500).json({ error: 'Failed to fetch calendar event' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, startTime, endTime, type, status, location, applyLink } = req.body;
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const newEvent = new CalendarEvent({
      title,
      description: description || '',
      date,
      startTime: startTime || '',
      endTime: endTime || '',
      type: type || 'other',
      status: status || 'pending',
      location: location || '',
      applyLink: applyLink || '',
      userId,
    });

    const savedEvent = await newEvent.save();
    await googleCalendarController.upsertMiraeEventToGoogle(userId, savedEvent);
    res.status(201).json({ message: 'Calendar event created', event: savedEvent });
  } catch (error) {
    console.error('Calendar createEvent error:', error.message);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      type: req.body.type,
      status: req.body.status,
      location: req.body.location,
      applyLink: req.body.applyLink,
    };

    const updatedEvent = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    await googleCalendarController.upsertMiraeEventToGoogle(userId, updatedEvent);

    res.status(200).json({ message: 'Calendar event updated', event: updatedEvent });
  } catch (error) {
    console.error('Calendar updateEvent error:', error.message);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const deletedEvent = await CalendarEvent.findOneAndDelete({ _id: req.params.id, userId });
    if (!deletedEvent) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }
    
    // If the event was synced from a dashboard job/hackathon, clear its deadline so it doesn't sync back
    if (deletedEvent.source === 'dashboard' && deletedEvent.sourceId) {
      try {
        const jobId = deletedEvent.sourceId.replace('dashboard-job-', '');
        if (jobId && jobId !== 'undefined') {
          await Job.findOneAndUpdate({ _id: jobId, userId }, { $unset: { deadline: 1 } });
        }
      } catch (err) {
        console.error('Error clearing dashboard job deadline on event delete:', err.message);
      }
    }
    
    await googleCalendarController.deleteMiraeEventFromGoogle(userId, deletedEvent.googleEventId);
    res.status(200).json({ message: 'Calendar event deleted' });
  } catch (error) {
    console.error('Calendar deleteEvent error:', error.message);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
};
