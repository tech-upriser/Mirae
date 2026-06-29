import { ChevronLeft, ChevronRight, ChevronDown, ExternalLink, Check, X, Edit2, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { calendarService } from '../services/calendarService';
import { googleCalendarService } from '../services/googleCalendarService';
import { CalendarEvent as ApiCalendarEvent, CalendarEventType } from '../types/calendar';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'deadline' | 'interview' | 'followup';
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: 'pending' | 'completed';
  location: string;
  applyLink: string;
}

interface AgendaTask {
  id: string;
  date: Date;
  dateLabel: string;
  relativeLabel: string;
  task: string;
  action: string;
  type: 'deadline' | 'interview' | 'followup';
  status: 'completed' | 'missed' | 'active';
  isPast: boolean;
  timeLabel: string;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const parseTimeToMinutes = (time: string) => {
  if (!time) return null;

  const [timeStr, period] = time.trim().split(' ');
  if (!timeStr || !period) return null;

  const [rawHours, rawMinutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return null;

  let hours = rawHours;
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + rawMinutes;
};

const getEventEndTime = (event: { type: 'deadline' | 'interview' | 'followup'; endTime: string }) =>
  event.type === 'interview' ? event.endTime || '10:00 AM' : event.endTime || '11:59 PM';

const getEventDisplayTime = (event: CalendarEvent) =>
  event.type === 'interview'
    ? `${event.startTime} - ${event.endTime}`
    : `Due by ${getEventEndTime(event)}`;

const getEventSortMinutes = (event: CalendarEvent) => {
  const time = event.type === 'interview' ? event.startTime : getEventEndTime(event);
  return parseTimeToMinutes(time) ?? (event.type === 'interview' ? 0 : 1439);
};

const formatDuration = (startTime: string, endTime: string) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return '1h';
  }

  const totalMinutes = endMinutes - startMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatDateInputValue = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const parseCalendarDate = (value: string) => {
  const [datePart] = String(value || '').split('T');
  const [year, month, day] = datePart.split('-').map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  return new Date(value);
};

const formatRelativeLabel = (date: Date, today: Date) => {
  const diffMs = startOfDay(date).getTime() - startOfDay(today).getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return '1 day ago';
  return `${Math.abs(diffDays)} days ago`;
};

const formatAgendaCountdown = (event: CalendarEvent, now: Date, today: Date) => {
  const eventDateTime = new Date(event.date);
  const eventMinutes = getEventSortMinutes(event);
  eventDateTime.setHours(Math.floor(eventMinutes / 60), eventMinutes % 60, 0, 0);

  const diffMs = eventDateTime.getTime() - now.getTime();
  if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000 && isSameDay(event.date, today)) {
    const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
    if (diffMinutes < 60) return `in ${diffMinutes} min`;
    const diffHours = Math.round(diffMinutes / 60);
    return `in ${diffHours} hr${diffHours === 1 ? '' : 's'}`;
  }

  return formatRelativeLabel(event.date, today).toLowerCase();
};

const getActionLabel = (type: 'deadline' | 'interview' | 'followup') => {
  return 'Open Details';
};

const getUiEventType = (type: CalendarEventType): 'deadline' | 'interview' | 'followup' => {
  switch (type) {
    case 'deadline':
      return 'deadline';
    case 'interview':
      return 'interview';
    case 'follow-up':
    case 'other':
    default:
      return 'followup';
  }
};

const getLinkLabel = (type: 'deadline' | 'interview' | 'followup' | CalendarEventType) =>
  type === 'deadline' ? 'Apply Link' : 'Official Website';

const getOpenLinkLabel = (type: 'deadline' | 'interview' | 'followup') =>
  type === 'deadline' ? 'Open apply link' : 'Open official website';

export function CalendarView() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [apiEvents, setApiEvents] = useState<ApiCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleSyncMessage, setGoogleSyncMessage] = useState<string | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [lockNewEventDate, setLockNewEventDate] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState<CalendarEventType>('deadline');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventApplyLink, setNewEventApplyLink] = useState('');
  const [addingEvent, setAddingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventPendingDelete, setEventPendingDelete] = useState<CalendarEvent | null>(null);
  const [selectedDetailEventId, setSelectedDetailEventId] = useState<string | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      await calendarService.syncDashboardReminders();
      const response = await calendarService.getAllEvents();
      setApiEvents(response.events);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const status = await googleCalendarService.getConnectionStatus();
      setGoogleCalendarConnected(Boolean(status.connected));
    } catch (error) {
      console.error('Google status error:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchGoogleStatus();
  }, []);

  const resetNewEventForm = () => {
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventType('deadline');
    setNewEventStart('');
    setNewEventEnd('11:59 PM');
    setNewEventDescription('');
    setNewEventLocation('');
    setNewEventApplyLink('');
    setEditingEventId(null);
  };

  const isPastDate = (date: Date) => startOfDay(date).getTime() < today.getTime();

  const openAddEventModal = (date?: Date, lockDate = false) => {
    const targetDate = date ? startOfDay(date) : today;
    resetNewEventForm();
    setNewEventDate(formatDateInputValue(targetDate));
    setLockNewEventDate(lockDate);
    setSelectedDate(targetDate);
    setShowAddEventModal(true);
  };

  const openEditEventModal = (event: CalendarEvent) => {
    resetNewEventForm();
    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventDate(formatDateInputValue(event.date));
    setNewEventType(event.type === 'followup' ? 'follow-up' : event.type);
    setNewEventStart(event.type === 'interview' ? event.startTime : '');
    setNewEventEnd(event.type === 'interview' || event.type === 'deadline' ? event.endTime : '11:59 PM');
    setNewEventDescription(event.description);
    setNewEventLocation(event.location);
    setNewEventApplyLink(event.applyLink);
    setLockNewEventDate(false);
    setSelectedDate(event.date);
    setShowAddEventModal(true);
  };

  const getIsoDateForSelectedDate = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString();

  const handleSaveEvent = async () => {
    if (!newEventTitle || !newEventDate) {
      alert('Please add a title and select a date.');
      return;
    }

    const pickedDate = startOfDay(new Date(`${newEventDate}T00:00:00`));

    if (Number.isNaN(pickedDate.getTime())) {
      alert('Please choose a valid date.');
      return;
    }

    if (isPastDate(pickedDate)) {
      alert('You can only add events for today or later.');
      return;
    }

    const isInterview = newEventType === 'interview';
    const isDeadline = newEventType === 'deadline';

    if (isInterview && (!newEventStart || !newEventEnd)) {
      alert('Please add a start time and end time for the interview.');
      return;
    }

    if (isDeadline && !newEventEnd) {
      alert('Please add a due time for the deadline.');
      return;
    }

    const existingEvent = editingEventId ? events.find((event) => event.id === editingEventId) : null;
    const payload = {
      title: newEventTitle,
      description: newEventDescription,
      date: getIsoDateForSelectedDate(pickedDate),
      startTime: isInterview ? newEventStart : '',
      endTime: isInterview || isDeadline ? newEventEnd : '11:59 PM',
      type: newEventType,
      status: existingEvent?.status || 'pending' as const,
      location: newEventLocation,
      applyLink: newEventApplyLink,
    };

    try {
      setAddingEvent(true);
      if (editingEventId) {
        await calendarService.updateEvent(editingEventId, payload);
        setCalendarMessage('Event updated.');
      } else {
        await calendarService.createEvent(payload);
        setCalendarMessage('Event added.');
      }
      await fetchEvents();
      setSelectedDate(pickedDate);
      setShowAddEventModal(false);

      if (googleCalendarConnected) {
        try {
          await handleGoogleCalendarSync();
        } catch (syncError) {
          console.error('Google Calendar sync failed after save:', syncError);
          setGoogleError(syncError instanceof Error ? syncError.message : 'Failed to sync with Google Calendar');
          setCalendarMessage((prev) => `${prev} (saved locally, Google sync failed)`);
        }
      }
    } catch (error) {
      console.error('Add event failed:', error);
      alert('Failed to add event. Please try again.');
    } finally {
      setAddingEvent(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventPendingDelete) return;
    try {
      await calendarService.deleteEvent(eventPendingDelete.id);
      await fetchEvents();
      if (googleCalendarConnected) {
        await handleGoogleCalendarSync();
      }
      setCalendarMessage('Event deleted.');
      setEventPendingDelete(null);
    } catch (error) {
      console.error('Delete event failed:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const events: CalendarEvent[] = useMemo(
    () =>
      apiEvents.map((event) => {
        const eventDate = parseCalendarDate(event.date);
        const type = getUiEventType(event.type);
        const startTime = type === 'interview' ? event.startTime || '09:00 AM' : '';
        const endTime = type === 'interview' ? event.endTime || '10:00 AM' : event.endTime || '11:59 PM';

        return {
          id: event._id,
          date: eventDate,
          type,
          title: event.title,
          description: event.description || '',
          startTime,
          endTime,
          duration: type === 'interview' ? formatDuration(startTime, endTime) : '',
          status: event.status,
          location: event.location || '',
          applyLink: event.applyLink || '',
        };
      }),
    [apiEvents]
  );

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const leadingEmptyDays = firstDayOfMonth.getDay();
  const totalCells = Math.ceil((leadingEmptyDays + daysInMonth) / 7) * 7;

  const calendarDays = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmptyDays + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return new Date(currentYear, currentMonth, dayNumber);
  });

  const getEventsForDate = (date: Date) => events.filter((event) => isSameDay(event.date, date));

  const hasClash = (date: Date) => {
    const dayEvents = getEventsForDate(date).filter((event) => event.type === 'interview');
    if (dayEvents.length < 2) return false;

    for (let index = 0; index < dayEvents.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < dayEvents.length; compareIndex += 1) {
        const event1Start = parseTimeToMinutes(dayEvents[index].startTime);
        const event1End = parseTimeToMinutes(dayEvents[index].endTime);
        const event2Start = parseTimeToMinutes(dayEvents[compareIndex].startTime);
        const event2End = parseTimeToMinutes(dayEvents[compareIndex].endTime);

        if (
          event1Start !== null &&
          event1End !== null &&
          event2Start !== null &&
          event2End !== null &&
          event1Start < event2End &&
          event2Start < event1End
        ) {
          return true;
        }
      }
    }

    return false;
  };

  const getEventColor = (type: 'deadline' | 'interview' | 'followup') => {
    switch (type) {
      case 'deadline':
        return { bg: '#FDE2E2', text: '#B42318' };
      case 'interview':
        return { bg: '#DDF7EA', text: '#067647' };
      case 'followup':
        return { bg: '#DBEAFE', text: '#1E40AF' };
    }
  };

  const getEventIcon = (type: 'deadline' | 'interview' | 'followup') => {
    switch (type) {
      case 'deadline':
        return 'Deadline';
      case 'interview':
        return 'Interview';
      case 'followup':
        return 'Follow-up';
    }
  };

  const handleGoogleCalendarConnect = async () => {
    setGoogleError(null);
    setGoogleSyncMessage(null);

    try {
      const { url } = await googleCalendarService.getAuthUrl();
      const popup = window.open(url, '_blank', 'width=600,height=700');

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event?.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
          setGoogleCalendarConnected(true);
          await fetchGoogleStatus();
          await fetchEvents();
          await handleGoogleCalendarSync();
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('Google Calendar connect failed:', error);
      setGoogleError(error instanceof Error ? error.message : 'Failed to connect Google Calendar');
      alert(error instanceof Error ? error.message : 'Failed to connect Google Calendar');
    }
  };

  const handleGoogleCalendarSync = async () => {
    try {
      setSyncing(true);
      setGoogleError(null);
      setGoogleSyncMessage(null);
      const result = await googleCalendarService.syncGoogleCalendar();
      await fetchEvents();
      setGoogleCalendarConnected(true);
      const exportedCount = result.exportedCount || 0;
      setGoogleSyncMessage(
        exportedCount === 1
          ? 'Google Calendar auto-synced: 1 reminder checked'
          : `Google Calendar auto-synced: ${exportedCount} reminders checked`
      );
    } catch (error) {
      console.error('Google Calendar sync failed:', error);
      setGoogleError(error instanceof Error ? error.message : 'Failed to sync with Google Calendar');
      alert(error instanceof Error ? error.message : 'Failed to sync with Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    if (!window.confirm('Do you want to disconnect Google Calendar?')) return;
    setGoogleCalendarConnected(false);
    setGoogleSyncMessage(null);
    setGoogleError(null);
    setCalendarMessage('Google Calendar disconnected.');
  };

  const weekStart = useMemo(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return startOfDay(start);
  }, [today]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return startOfDay(end);
  }, [weekStart]);

  const weekEvents = events.filter((event) => {
    const eventDay = startOfDay(event.date).getTime();
    return eventDay >= weekStart.getTime() && eventDay <= weekEnd.getTime();
  });

  const weekStats = {
    total: weekEvents.length,
    interviews: weekEvents.filter((event) => event.type === 'interview').length,
    deadlines: weekEvents.filter((event) => event.type === 'deadline').length,
    followups: weekEvents.filter((event) => event.type === 'followup').length,
  };

  const eventsSortedByDate = [...events].sort((left, right) => {
    const leftDateTime = new Date(left.date);
    const rightDateTime = new Date(right.date);
    const leftMinutes = getEventSortMinutes(left);
    const rightMinutes = getEventSortMinutes(right);

    leftDateTime.setHours(Math.floor(leftMinutes / 60), leftMinutes % 60, 0, 0);
    rightDateTime.setHours(Math.floor(rightMinutes / 60), rightMinutes % 60, 0, 0);

    return leftDateTime.getTime() - rightDateTime.getTime();
  });

  const now = new Date();
  const getAgendaStatus = (event: CalendarEvent): AgendaTask['status'] => {
    const eventDateTime = new Date(event.date);
    const eventMinutes = getEventSortMinutes(event);
    eventDateTime.setHours(Math.floor(eventMinutes / 60), eventMinutes % 60, 0, 0);

    if (event.status === 'completed') return 'completed';
    if (eventDateTime.getTime() < now.getTime()) return 'missed';
    return 'active';
  };

  const buildAgendaTask = (event: CalendarEvent): AgendaTask => {
    const status = getAgendaStatus(event);
    const isPast = status !== 'active';

    return {
      id: event.id,
      date: event.date,
      dateLabel: formatDateLabel(event.date),
      relativeLabel: formatAgendaCountdown(event, now, today),
      task: event.title,
      action: getActionLabel(event.type),
      type: event.type,
      status,
      isPast,
      timeLabel: getEventDisplayTime(event),
    };
  };

  const futureAgenda = eventsSortedByDate
    .filter((event) => getAgendaStatus(event) === 'active')
    .slice(0, 3)
    .map(buildAgendaTask);

  const pastAgenda = eventsSortedByDate
    .filter((event) => getAgendaStatus(event) !== 'active')
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .map(buildAgendaTask);

  const selectedDetailEvent = selectedDetailEventId
    ? events.find((event) => event.id === selectedDetailEventId) || null
    : null;
  const selectedDateEvents = selectedDetailEvent
    ? [selectedDetailEvent]
    : selectedDate
    ? [...getEventsForDate(selectedDate)].sort((left, right) => getEventSortMinutes(left) - getEventSortMinutes(right))
    : [];

  const addEventButtonLabel = 'Add Event';

  const getModalStatusLabel = (event: CalendarEvent) => {
    const status = getAgendaStatus(event);
    if (status === 'completed') return 'Completed';
    if (status === 'missed') return 'Missed';
    return 'No action';
  };

  return (
    <div className="ml-60 min-h-screen bg-[#E5E5E5] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[#000000]" style={{ fontFamily: 'var(--font-display)' }}>
              Calendar & Reminders
            </h1>
            <p className="mt-2 text-sm text-[#475467]">
              Add reminders only for today or upcoming dates. Your next 3 events and past history update automatically.
            </p>
          </div>
          <button
            onClick={() => openAddEventModal(undefined, false)}
            className="rounded-xl bg-[#FCA311] px-5 py-3 text-sm font-semibold text-[#000000] shadow-sm transition-colors hover:bg-[#fdb748]"
          >
            {addEventButtonLabel}
          </button>
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-xl p-8 shadow-sm border border-[#E5E5E5]"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="relative">
                <button
                  onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-[#E5E5E5] rounded-lg transition-colors"
                >
                  <h2 className="text-2xl font-bold text-[#14213D]" style={{ fontFamily: 'var(--font-display)' }}>
                    {monthNames[currentMonth]} {currentYear}
                  </h2>
                  <ChevronDown className="w-5 h-5 text-[#14213D]" />
                </button>

                <AnimatePresence>
                  {showMonthYearPicker && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowMonthYearPicker(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-[#E5E5E5] p-4 z-30 w-80"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <button
                            onClick={() => setCurrentYear((year) => year - 1)}
                            className="rounded-lg p-1 text-[#14213D] hover:bg-[#E5E5E5]"
                            aria-label="Previous year"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-semibold text-[#14213D]">{currentYear}</span>
                          <button
                            onClick={() => setCurrentYear((year) => year + 1)}
                            className="rounded-lg p-1 text-[#14213D] hover:bg-[#E5E5E5]"
                            aria-label="Next year"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#14213D] mb-3 block">Select Month</label>
                          <div className="grid grid-cols-3 gap-2">
                            {monthNames.map((month, index) => (
                              <button
                                key={month}
                                onClick={() => {
                                  setCurrentMonth(index);
                                  setShowMonthYearPicker(false);
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  currentMonth === index
                                    ? 'bg-[#FCA311] text-[#000000]'
                                    : 'bg-[#E5E5E5] text-[#14213D] hover:bg-[#FCA311] hover:bg-opacity-20'
                                }`}
                              >
                                {month.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

            </div>

            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-[#14213D] pb-3">
                  {day}
                </div>
              ))}

              {loading ? (
                Array.from({ length: 35 }, (_, index) => (
                  <div key={index} className="aspect-square border rounded-xl p-3 bg-gray-100 animate-pulse">
                    <div className="w-4 h-4 bg-gray-300 rounded mb-2"></div>
                  </div>
                ))
              ) : (
                calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square border border-transparent" />;
                  }

                  const dayEvents = getEventsForDate(date);
                  const isToday = isSameDay(date, today);
                  const isClash = hasClash(date);
                  const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                  const isPast = isPastDate(date);

                  return (
                    <div
                      key={date.toISOString()}
                      onClick={() => {
                        setSelectedDetailEventId(null);
                        setSelectedDate(date);
                      }}
                      className={`
                        aspect-square border rounded-xl p-3 relative transition-all cursor-pointer
                        ${!isToday && !isClash && !isSelected && !isPast ? 'bg-white border-[#E5E5E5] hover:border-[#FCA311] hover:shadow-sm' : ''}
                        ${isToday ? 'bg-[#E0F2FE] border-[#E5E5E5] shadow-sm relative' : ''}
                        ${isClash && !isToday ? 'bg-[#FEF2F2] border-[#B42318] border-2 shadow-[0_0_0_3px_rgba(180,35,24,0.16)]' : ''}
                        ${isSelected && !isToday ? 'bg-white border-[#14213D] border-2 shadow-lg' : ''}
                        ${isClash ? 'ring-4 ring-[#B42318]/20' : ''}
                        ${isPast ? 'bg-[#F3F4F6] border-[#D0D5DD] opacity-65 grayscale' : ''}
                      `}
                    >
                      {isToday && (
                        <div className="absolute top-2 left-2 h-7 w-7 rounded-full bg-[#378ADD] -z-0"></div>
                      )}
                      <span className={`relative z-10 text-sm font-semibold ${isToday ? 'text-white' : 'text-[#14213D]'}`}>
                        {date.getDate()}
                      </span>

                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                          {dayEvents.slice(0, 3).map((event) => {
                            const colors = getEventColor(event.type);
                            return (
                              <div
                                key={`${event.id}-dot`}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: colors.text }}
                              />
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[8px] text-[#6b7280] font-medium">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-[#E5E5E5] space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#E0F2FE] bg-opacity-50 rounded-lg border border-[#378ADD] border-opacity-20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-[#378ADD]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#14213D]">
                      {googleCalendarConnected ? 'Google Calendar Connected' : 'Google Calendar Disconnected'}
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {googleCalendarConnected ? 'Auto-syncing events & reminders' : 'Click to connect and sync'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {googleCalendarConnected ? (
                    <>
                      <div className="w-2 h-2 bg-[#067647] rounded-full animate-pulse"></div>
                      <span className="text-xs text-[#067647] font-medium">Active</span>
                      <button
                        onClick={handleDisconnectGoogleCalendar}
                        className="px-3 py-1 bg-[#B42318] text-white text-xs rounded hover:bg-[#991B14] transition-colors"
                      >
                        Disconnect
                      </button>
                      <button
                        onClick={handleGoogleCalendarSync}
                        disabled={syncing}
                        className="px-3 py-1 bg-[#22C55E] text-white text-xs rounded hover:bg-[#16A34A] transition-colors disabled:opacity-50"
                      >
                        {syncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleGoogleCalendarConnect}
                      className="px-3 py-1 bg-[#378ADD] text-white text-xs rounded hover:bg-[#2E6BB8] transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
              {googleError && (
                <div className="text-sm text-[#B42318]">{googleError}</div>
              )}
              {googleSyncMessage && (
                <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm font-medium text-[#067647]">
                  {googleSyncMessage}
                </div>
              )}
              {calendarMessage && (
                <div className="rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-sm font-medium text-[#14213D]">
                  {calendarMessage}
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#378ADD] rounded-full"></div>
                  <span className="text-sm text-[#14213D]">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-[#B42318] shadow-[0_0_0_3px_rgba(180,35,24,0.16)]"></div>
                  <span className="text-sm text-[#14213D]">Time Clash</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#B42318] rounded-full"></div>
                  <span className="text-xs text-[#14213D]">Deadline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#067647] rounded-full"></div>
                  <span className="text-xs text-[#14213D]">Interview</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#1E40AF] rounded-full"></div>
                  <span className="text-xs text-[#14213D]">Follow-up</span>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/20 p-8"
                style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedDetailEventId(null);
                }}
              >
                <motion.div
                  onClick={(event) => event.stopPropagation()}
                  className="bg-white rounded-xl p-6 shadow-2xl border border-[#E5E5E5] max-w-md w-full max-h-[80vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-xl font-bold text-[#14213D]" style={{ fontFamily: 'var(--font-display)' }}>
                        {selectedDetailEvent ? 'Event Details' : `${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`}
                      </h3>
                      <p className="text-sm text-[#6b7280] mt-1">
                        {selectedDetailEvent
                          ? formatDateLabel(selectedDetailEvent.date)
                          : selectedDateEvents.length === 0
                          ? 'No events scheduled'
                          : `${selectedDateEvents.length} event${selectedDateEvents.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDate(null);
                        setSelectedDetailEventId(null);
                      }}
                      className="p-2 hover:bg-[#E5E5E5] rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-[#14213D]" />
                    </button>
                  </div>

                  {selectedDateEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[#E5E5E5] rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="w-8 h-8 text-[#14213D] opacity-40" />
                      </div>
                      {isPastDate(selectedDate) ? (
                        <p className="text-[#6b7280] mb-4">You can&apos;t add events on this day.</p>
                      ) : (
                        <>
                          <p className="text-[#6b7280] mb-4">No reminders for this day</p>
                          <button
                            onClick={() => openAddEventModal(selectedDate, true)}
                            className="px-4 py-2 bg-[#FCA311] text-[#000000] rounded-lg font-semibold hover:bg-[#fdb748] transition-all text-sm"
                          >
                            + Add Event
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => {
                        const colors = getEventColor(event.type);
                        return (
                          <div
                            key={event.id}
                            className="rounded-lg border border-[#E5E5E5] p-4 transition-colors hover:border-[#FCA311]"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="font-bold text-base text-[#14213D] mb-1">{event.title}</div>
                                <div className="text-sm text-[#6b7280]">
                                  {event.type === 'interview' ? (
                                    <>
                                      {getEventDisplayTime(event)} <span className="text-xs">({event.duration})</span>
                                    </>
                                  ) : (
                                    getEventDisplayTime(event)
                                  )}
                                </div>
                                <div className="mt-1 text-xs font-semibold text-[#98A2B3]">
                                  Status: {getModalStatusLabel(event)}
                                </div>
                                {selectedDetailEvent && (
                                  <div className="mt-4 grid gap-3 text-sm text-[#14213D]">
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">Date</div>
                                      <div>{formatDateLabel(event.date)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">Title</div>
                                      <div>{event.title}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">Type</div>
                                      <div>{event.type === 'interview' ? 'Interview' : event.type === 'deadline' ? 'Deadline' : 'Follow-up'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">Time</div>
                                      <div>
                                        {event.type === 'interview'
                                          ? `${getEventDisplayTime(event)} (${event.duration})`
                                          : getEventDisplayTime(event)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">Location</div>
                                      <div>{event.location || 'Not specified'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">{getLinkLabel(event.type)}</div>
                                      {event.applyLink ? (
                                        <a
                                          href={event.applyLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 font-semibold text-[#1E40AF] hover:underline"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                          {event.applyLink}
                                        </a>
                                      ) : (
                                        <div>Not provided</div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">Description</div>
                                      <div className="whitespace-pre-wrap">{event.description || 'No description added.'}</div>
                                    </div>
                                  </div>
                                )}
                                {event.applyLink && !selectedDetailEvent && (
                                  <a
                                    href={event.applyLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#1E40AF] hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    {getOpenLinkLabel(event.type)}
                                  </a>
                                )}
                              </div>
                              <span
                                className="px-3 py-1 rounded-full text-xs font-semibold ml-3 flex-shrink-0"
                                style={{ backgroundColor: colors.bg, color: colors.text }}
                              >
                                {event.type === 'interview' ? 'Interview' : event.type === 'deadline' ? 'Deadline' : 'Follow-up'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditEventModal(event)}
                                className="p-2 hover:bg-[#E5E5E5] rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-[#14213D]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEventPendingDelete(event)}
                                className="p-2 hover:bg-[#FDE2E2] rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-[#B42318]" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {!isPastDate(selectedDate) && !selectedDetailEvent && (
                        <button
                          onClick={() => openAddEventModal(selectedDate, true)}
                          className="w-full rounded-lg border border-dashed border-[#FCA311] px-4 py-3 text-sm font-semibold text-[#14213D] transition-colors hover:bg-[#FFF5E8]"
                        >
                          + Add another event on {formatDateLabel(selectedDate)}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E5E5]"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[#14213D]" style={{ fontFamily: 'var(--font-display)' }}>
                  Weekly Summary
                </h2>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
                  {formatDateLabel(weekStart)} - {formatDateLabel(weekEnd)}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#E5E5E5]">
                  <span className="text-sm text-[#14213D]">Total Events</span>
                  <span className="text-xl font-bold text-[#FCA311]">{weekStats.total}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#E5E5E5]">
                  <span className="text-sm text-[#14213D]">Interviews</span>
                  <span className="text-lg font-bold text-[#067647]">{weekStats.interviews}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#E5E5E5]">
                  <span className="text-sm text-[#14213D]">Deadlines</span>
                  <span className="text-lg font-bold text-[#B42318]">{weekStats.deadlines}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#E5E5E5]">
                  <span className="text-sm text-[#14213D]">Follow-ups</span>
                  <span className="text-lg font-bold text-[#1E40AF]">{weekStats.followups}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E5E5]"
            >
              <div className="mb-5">
                <h2 className="text-lg font-bold text-[#14213D]" style={{ fontFamily: 'var(--font-display)' }}>
                  Upcoming Agenda
                </h2>
              </div>

              <div className="max-h-[460px] space-y-4 overflow-y-auto pr-1">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Next 3 events</div>
                  {futureAgenda.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D0D5DD] px-4 py-5 text-sm text-[#667085]">
                      No upcoming events yet.
                    </div>
                  ) : (
                    futureAgenda.map((task, index) => {
                      const colors = getEventColor(task.type);

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                          className="border rounded-xl p-4 transition-all border-[#E5E5E5] bg-white hover:border-[#FCA311] hover:shadow-sm cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="text-xs font-bold text-[#FCA311]">
                                  {task.relativeLabel}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-[#14213D]">{task.task}</div>
                              <div className="mt-1 text-xs text-[#667085]">
                                {task.dateLabel} • {task.timeLabel}
                              </div>
                            </div>
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-semibold ml-3 flex-shrink-0"
                              style={{ backgroundColor: colors.bg, color: colors.text }}
                            >
                              {getEventIcon(task.type)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDetailEventId(task.id);
                              setSelectedDate(startOfDay(task.date));
                            }}
                            className="w-full px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 bg-[#FCA311] text-[#000000] hover:bg-[#fdb748] shadow-sm hover:shadow-md"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {task.action}
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Past activity</div>
                  {pastAgenda.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D0D5DD] px-4 py-5 text-sm text-[#667085]">
                      No past events yet.
                    </div>
                  ) : (
                    pastAgenda.map((task, index) => {
                      const isCompleted = task.status === 'completed';
                      const isMissed = task.status === 'missed';

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                          className="border rounded-xl p-4 transition-all border-[#E5E5E5] bg-[#f9fafb] opacity-60"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="text-xs font-bold text-[#9ca3af]">
                                  {task.relativeLabel}
                                </div>
                                {isCompleted && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#067647] bg-[#DDF7EA] px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" />
                                    <span>Completed</span>
                                  </div>
                                )}
                                {isMissed && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#B42318] bg-[#FDE2E2] px-2 py-0.5 rounded-full">
                                    <X className="w-3 h-3" />
                                    <span>Missed</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-sm font-semibold text-[#9ca3af]">{task.task}</div>
                              <div className="mt-1 text-xs text-[#98A2B3]">
                                {task.dateLabel} • {task.timeLabel}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold ml-3 flex-shrink-0 bg-[#f3f4f6] text-[#9ca3af]">
                              {getEventIcon(task.type)}
                            </span>
                          </div>
                          <button
                            className="w-full px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 bg-[#E5E5E5] text-[#9ca3af] cursor-not-allowed"
                            disabled
                          >
                            {isCompleted ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            {isCompleted ? 'Completed' : 'Missed'}
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAddEventModal && selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto bg-white/20 p-6"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onClick={() => setShowAddEventModal(false)}
          >
            <motion.div
              onClick={(event) => event.stopPropagation()}
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-[#E5E5E5] max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#14213D]" style={{ fontFamily: 'var(--font-display)' }}>
                    {editingEventId ? 'Edit Event' : 'Add Event'}
                  </h3>
                  <p className="text-sm text-[#6b7280]">
                    {editingEventId ? 'Update the date, time, or details for this event.' : 'Choose the date, time, and details before saving.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddEventModal(false)}
                  className="p-2 rounded-lg hover:bg-[#E5E5E5] transition-colors"
                >
                  <X className="w-5 h-5 text-[#14213D]" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[#14213D]">Date</label>
                  <input
                    type="date"
                    value={newEventDate}
                    min={formatDateInputValue(today)}
                    disabled={lockNewEventDate}
                    onChange={(event) => setNewEventDate(event.target.value)}
                    className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311] disabled:bg-[#F8FAFC] disabled:text-[#667085]"
                  />
                  {lockNewEventDate && (
                    <p className="text-xs text-[#667085]">Using the date you selected on the calendar.</p>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[#14213D]">Title</label>
                  <input
                    value={newEventTitle}
                    onChange={(event) => setNewEventTitle(event.target.value)}
                    className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                    placeholder="Event title"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[#14213D]">Type</label>
                  <select
                    value={newEventType}
                    onChange={(event) => {
                      const nextType = event.target.value as CalendarEventType;
                      setNewEventType(nextType);
                      if (nextType === 'interview') {
                        setNewEventStart('09:00 AM');
                        setNewEventEnd('10:00 AM');
                      } else if (nextType === 'deadline') {
                        setNewEventStart('');
                        setNewEventEnd('');
                      } else {
                        setNewEventStart('');
                        setNewEventEnd('11:59 PM');
                      }
                    }}
                    className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                  >
                    <option value="deadline">Deadline</option>
                    <option value="interview">Interview</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {newEventType === 'interview' ? (
                  <>
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-[#14213D]">Start Time</label>
                      <input
                        value={newEventStart}
                        onChange={(event) => setNewEventStart(event.target.value)}
                        className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                        placeholder="09:00 AM"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-[#14213D]">End Time</label>
                      <input
                        value={newEventEnd}
                        onChange={(event) => setNewEventEnd(event.target.value)}
                        className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                        placeholder="10:00 AM"
                      />
                    </div>
                  </>
                ) : newEventType === 'deadline' ? (
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-sm font-semibold text-[#14213D]">Due Time</label>
                    <input
                      value={newEventEnd}
                      onChange={(event) => setNewEventEnd(event.target.value)}
                      className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                      placeholder="11:59 PM"
                    />
                    <p className="text-xs text-[#667085]">
                      Dashboard deadlines can fill this automatically, but manual deadlines need a due time.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#FCA311]/30 bg-[#FFF7E8] px-4 py-3 text-sm text-[#14213D] md:col-span-2">
                    Follow-ups are saved as date reminders due by 11:59 PM.
                  </div>
                )}
              </div>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-semibold text-[#14213D]">Location</label>
                  <input
                    value={newEventLocation}
                    onChange={(event) => setNewEventLocation(event.target.value)}
                    className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                    placeholder="Location (optional)"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#14213D]">{getLinkLabel(newEventType)}</label>
                  <input
                    value={newEventApplyLink}
                    onChange={(event) => setNewEventApplyLink(event.target.value)}
                    className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                    placeholder={newEventType === 'deadline' ? 'https://example.com/apply' : 'https://company.com'}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#14213D]">Description</label>
                  <textarea
                    value={newEventDescription}
                    onChange={(event) => setNewEventDescription(event.target.value)}
                    className="w-full min-h-[120px] rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FCA311]"
                    placeholder="Add more context here..."
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#14213D] hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={addingEvent}
                  className="px-5 py-2 rounded-xl bg-[#FCA311] text-sm font-semibold text-[#000000] hover:bg-[#fdb748] transition-colors disabled:opacity-60"
                >
                  {addingEvent ? 'Saving...' : editingEventId ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {eventPendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100001] flex items-center justify-center bg-white/25 p-6"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onClick={() => setEventPendingDelete(null)}
          >
            <motion.div
              onClick={(event) => event.stopPropagation()}
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[#14213D]" style={{ fontFamily: 'var(--font-display)' }}>
                    Delete this event?
                  </h3>
                  <p className="mt-2 text-sm text-[#667085]">
                    Do you want to delete “{eventPendingDelete.title}” from your calendar?
                  </p>
                </div>
                <button
                  onClick={() => setEventPendingDelete(null)}
                  className="rounded-lg p-2 transition-colors hover:bg-[#E5E5E5]"
                >
                  <X className="h-5 w-5 text-[#14213D]" />
                </button>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEventPendingDelete(null)}
                  className="rounded-xl border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#14213D] transition-colors hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  className="rounded-xl bg-[#B42318] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#991B14]"
                >
                  Delete Event
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
