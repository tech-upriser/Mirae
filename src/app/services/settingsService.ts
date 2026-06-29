import api from "./api";

export interface SettingsData {
  notifications: {
    followUpReminders: boolean;
    deadlineAlerts: boolean;
    interviewReminders: boolean;
    notificationsEnabled: boolean;
    remindersEnabled: boolean;
    browserNotifications: boolean;
    notificationTiming: "1day" | "3days" | "custom";
    customReminderHours: number;
  };
  preferences: {
    defaultStatus: "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected";
    duplicateDetection: boolean;
    autoTagging: boolean;
    defaultTags: string[];
  };
  appearance: {
    theme: "light" | "dark";
    accentStyle: "gold" | "soft-gold";
    cardLayout: "compact" | "comfortable";
  };
  privacy: {
    securityActivityAlerts: boolean;
    profileDiscoverability: boolean;
  };
}

interface SettingsApiResponse {
  message: string;
  settings: SettingsData;
}

interface ClearDataResponse {
  message: string;
}

export const getSettings = async (): Promise<SettingsData> => {
  const { data } = await api.get<SettingsApiResponse>("/settings");
  return data.settings;
};

export const updateSettings = async (
  settings: SettingsData,
): Promise<SettingsData> => {
  const { data } = await api.put<SettingsApiResponse>("/settings", settings);
  return data.settings;
};

export const resetSettings = async (): Promise<SettingsData> => {
  const { data } = await api.post<SettingsApiResponse>("/settings/reset");
  return data.settings;
};

export const clearAllApplicationData = async (): Promise<string> => {
  const { data } = await api.post<ClearDataResponse>("/settings/clear-data");
  return data.message;
};

// NEW: Gmail Integration Interfaces and API Call
export interface GmailStatusResponse {
  isConnected: boolean;
  lastSynced?: string; // Optional: Useful if you want to show when it last checked for emails
}

export const getGmailConnectionStatus =
  async (): Promise<GmailStatusResponse> => {
    try {
      const { data } = await api.get<GmailStatusResponse>(
        "/gmail/status",
      );
      return data;
    } catch (error) {
      console.error("Failed to get Gmail connection status:", error);
      return { isConnected: false };
    }
  };

export const disconnectGmail = async (): Promise<void> => {
  await api.post("/gmail/disconnect");
};

export const getGoogleCalendarStatus = async (): Promise<{ connected: boolean }> => {
  try {
    const { data } = await api.get("/auth/google/status");
    return data;
  } catch (error) {
    console.error("Failed to get Google Calendar status:", error);
    return { connected: false };
  }
};

export const disconnectGoogleCalendar = async (): Promise<void> => {
  await api.post("/auth/google/disconnect");
};

export const syncGoogleCalendar = async (): Promise<{ message: string, exportedCount: number, syncedCount: number }> => {
  const { data } = await api.post("/auth/google/sync");
  return data;
};
