const User = require("../models/User");
const Job = require("../models/Job");
const Settings = require("../models/Settings");

const DEFAULT_SETTINGS = {
  notifications: {
    followUpReminders: true,
    deadlineAlerts: true,
    interviewReminders: true,
    notificationsEnabled: true,
    remindersEnabled: true,
    browserNotifications: true,
    notificationTiming: "1day",
    customReminderHours: 6
  },
  preferences: {
    defaultStatus: "Saved",
    defaultTags: ["Remote", "Internship", "Urgent"],
    duplicateDetection: true,
    autoTagging: false
  },
  appearance: {
    theme: "light",
    accentStyle: "gold",
    cardLayout: "comfortable"
  },
  privacy: {
    securityActivityAlerts: true,
    profileDiscoverability: false
  }
};

const normalizeSettingsPayload = (incoming = {}) => {
  const notifications = {
    ...DEFAULT_SETTINGS.notifications,
    ...(incoming.notifications || {})
  };

  const preferences = {
    ...DEFAULT_SETTINGS.preferences,
    ...(incoming.preferences || {})
  };

  const appearance = {
    ...DEFAULT_SETTINGS.appearance,
    ...(incoming.appearance || {})
  };

  const privacy = {
    ...DEFAULT_SETTINGS.privacy,
    ...(incoming.privacy || {})
  };

  if (!Array.isArray(preferences.defaultTags)) {
    preferences.defaultTags = [...DEFAULT_SETTINGS.preferences.defaultTags];
  }

  preferences.defaultTags = preferences.defaultTags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 10);

  if (preferences.defaultTags.length === 0) {
    preferences.defaultTags = [...DEFAULT_SETTINGS.preferences.defaultTags];
  }

  const customReminderHours = Number(notifications.customReminderHours);
  notifications.customReminderHours =
    Number.isFinite(customReminderHours) && customReminderHours >= 1 && customReminderHours <= 72
      ? customReminderHours
      : DEFAULT_SETTINGS.notifications.customReminderHours;

  return {
    notifications,
    preferences,
    appearance,
    privacy
  };
};

const ensureSettingsForUser = async (user) => {
  let settings = await Settings.findOne({ userId: user._id });
  if (!settings) {
    const legacy = user.settings
      ? {
          notifications: {
            followUpReminders: user.settings.notifications?.followUpReminders,
            deadlineAlerts: user.settings.notifications?.deadlineAlerts,
            interviewReminders: user.settings.notifications?.interviewReminders,
            notificationsEnabled: user.settings.notificationsEnabled,
            remindersEnabled: user.settings.reminders,
            browserNotifications: true,
            notificationTiming: user.settings.notifications?.notificationTiming
          },
          preferences: {
            defaultStatus:
              user.settings.applicationPreferences?.defaultStatus === "saved"
                ? "Saved"
                : user.settings.applicationPreferences?.defaultStatus,
            defaultTags: user.settings.applicationPreferences?.quickTags,
            duplicateDetection: user.settings.applicationPreferences?.duplicateDetection,
            autoTagging: user.settings.applicationPreferences?.autoTagging
          },
          appearance: {
            theme: user.settings.appearance?.theme,
            accentStyle:
              user.settings.appearance?.accentColor === "soft-gold" ? "soft-gold" : user.settings.appearance?.accentColor,
            cardLayout: user.settings.appearance?.cardLayout
          }
        }
      : {};

    settings = await Settings.create({
      userId: user._id,
      ...normalizeSettingsPayload(legacy)
    });
  }

  return settings;
};

exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const settingsDoc = await ensureSettingsForUser(user);

    return res.status(200).json({
      message: "Settings loaded successfully",
      settings: normalizeSettingsPayload(settingsDoc.toObject())
    });
  } catch (error) {
    console.error("Error loading settings:", error);
    return res.status(500).json({ message: "Failed to load settings" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const payload = normalizeSettingsPayload(req.body);
    const settingsDoc = await Settings.findOneAndUpdate(
      { userId: user._id },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    user.settings = {
      profile: {
        name: user.name || "",
        email: user.email || ""
      },
      notifications: {
        followUpReminders: settingsDoc.notifications.followUpReminders,
        deadlineAlerts: settingsDoc.notifications.deadlineAlerts,
        interviewReminders: settingsDoc.notifications.interviewReminders,
        notificationTiming: settingsDoc.notifications.notificationTiming
      },
      notificationsEnabled: settingsDoc.notifications.notificationsEnabled,
      reminders: settingsDoc.notifications.remindersEnabled,
      applicationPreferences: {
        defaultStatus: settingsDoc.preferences.defaultStatus.toLowerCase(),
        duplicateDetection: settingsDoc.preferences.duplicateDetection,
        autoTagging: settingsDoc.preferences.autoTagging,
        quickTags: settingsDoc.preferences.defaultTags
      },
      appearance: {
        theme: settingsDoc.appearance.theme,
        accentColor: settingsDoc.appearance.accentStyle,
        cardLayout: settingsDoc.appearance.cardLayout
      }
    };
    await user.save();

    return res.status(200).json({
      message: "Settings updated successfully",
      settings: normalizeSettingsPayload(settingsDoc.toObject())
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return res.status(500).json({ message: "Failed to update settings" });
  }
};

exports.resetSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const settingsDoc = await Settings.findOneAndUpdate(
      { userId: user._id },
      { $set: DEFAULT_SETTINGS },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    user.settings = {
      profile: {
        name: user.name || "",
        email: user.email || ""
      },
      notifications: {
        followUpReminders: settingsDoc.notifications.followUpReminders,
        deadlineAlerts: settingsDoc.notifications.deadlineAlerts,
        interviewReminders: settingsDoc.notifications.interviewReminders,
        notificationTiming: settingsDoc.notifications.notificationTiming
      },
      notificationsEnabled: settingsDoc.notifications.notificationsEnabled,
      reminders: settingsDoc.notifications.remindersEnabled,
      applicationPreferences: {
        defaultStatus: settingsDoc.preferences.defaultStatus.toLowerCase(),
        duplicateDetection: settingsDoc.preferences.duplicateDetection,
        autoTagging: settingsDoc.preferences.autoTagging,
        quickTags: settingsDoc.preferences.defaultTags
      },
      appearance: {
        theme: settingsDoc.appearance.theme,
        accentColor: settingsDoc.appearance.accentStyle,
        cardLayout: settingsDoc.appearance.cardLayout
      }
    };
    await user.save();

    return res.status(200).json({
      message: "Settings reset successfully",
      settings: normalizeSettingsPayload(settingsDoc.toObject())
    });
  } catch (error) {
    console.error("Error resetting settings:", error);
    return res.status(500).json({ message: "Failed to reset settings" });
  }
};

exports.clearData = async (req, res) => {
  try {
    const userId = req.user.id;
    const Contact = require('../models/Contact');
    const CalendarEvent = require('../models/CalendarEvent');
    
    await Job.deleteMany({ userId });
    await Contact.deleteMany({ userId });
    await CalendarEvent.deleteMany({ userId });

    return res.status(200).json({
      message: "All application data cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing user data:", error);
    return res.status(500).json({ message: "Failed to clear user data" });
  }
};
