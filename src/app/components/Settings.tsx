/* eslint-disable */
// @ts-nocheck
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Switch from "@radix-ui/react-switch";
import {
  AlertTriangle,
  Bell,
  Camera,
  Lock,
  RotateCcw,
  User,
  UserX,
  X,
  Mail,
  CheckCircle,
  FileText,
  Link2,
  HelpCircle,
  LogOut,
  Moon,
  Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import {
  clearAllApplicationData,
  getSettings,
  resetSettings,
  updateSettings,
  getGmailConnectionStatus,
  disconnectGmail,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
  syncGoogleCalendar,
  type SettingsData,
} from "../services/settingsService";
import { setTheme, useTheme } from "../hooks/useTheme";
import { useUser } from "../contexts/UserContext";
import api from "../services/api";

const defaultSettings: SettingsData = {
  notifications: {
    followUpReminders: true,
    deadlineAlerts: true,
    interviewReminders: true,
    notificationsEnabled: true,
    remindersEnabled: true,
    browserNotifications: true,
    notificationTiming: "1day",
    customReminderHours: 6,
  },
  preferences: {
    defaultStatus: "Saved",
    duplicateDetection: true,
    autoTagging: false,
    defaultTags: ["Remote", "Internship", "Urgent"],
  },
  appearance: {
    theme: "light",
    accentStyle: "gold",
    cardLayout: "comfortable",
  },
  privacy: {
    securityActivityAlerts: true,
    profileDiscoverability: false,
  },
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const applyAppearance = (appearance: SettingsData["appearance"]) => {
  setTheme(appearance.theme);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.accentStyle = appearance.accentStyle;
    document.documentElement.dataset.cardLayout = appearance.cardLayout;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem("accentStyle", appearance.accentStyle);
    window.localStorage.setItem("cardLayout", appearance.cardLayout);
  }
};

function ToggleRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-card-foreground" style={{ fontFamily: "Outfit" }}>
        {label}
      </span>
      <Switch.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 cursor-pointer rounded-full bg-gray-300 transition-all data-[state=checked]:bg-[#FCA311] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-card shadow transition-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}

// isNotificationMasterOff removed

function SectionCard({
  icon,
  title,
  subtitle,
  danger,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`app-card rounded-xl bg-card p-6 shadow-md ${danger ? "border-2 border-[#DC6B6B] bg-red-50/20" : ""}`}
    >
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-3">
          <div className={danger ? "text-[#DC6B6B]" : "text-[#FCA311]"}>
            {icon}
          </div>
          <h2
            className={`text-2xl font-bold ${danger ? "text-[#DC6B6B]" : "text-card-foreground"}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
        </div>
        <p
          className="ml-9 text-sm text-card-foreground/50"
          style={{ fontFamily: "Outfit" }}
        >
          {subtitle}
        </p>
      </div>
      {children}
    </motion.section>
  );
}

interface SettingsProps {
  onManageResumesOpen?: () => void;
  onSocialPortfolioOpen?: () => void;
  onLogoutOpen?: () => void;
}

export function Settings({
  onManageResumesOpen,
  onSocialPortfolioOpen,
  onLogoutOpen,
}: SettingsProps) {
  const navigate = useNavigate();
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Destructure everything from context properly inside the component
  const { user, refetchProfile, isGmailConnected, setIsGmailConnected } =
    useUser();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [name, setName] = useState("User");
  const [email, setEmail] = useState("user@example.com");
  const [tagline, setTagline] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [draftName, setDraftName] = useState("User");
  const [draftEmail, setDraftEmail] = useState("user@example.com");
  const [draftTagline, setDraftTagline] = useState("");

  const currentProfilePhoto = profilePhoto || user?.profilePhoto || "";
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  const handleConnectGmail = async () => {
    try {
      toast.info("Requesting authorization from Google...");
      // Ask the backend for the Google Auth URL
      const response = await api.get("/gmail/auth");

      if (response.data && response.data.url) {
        // Redirect the user's browser to the Google Consent Screen
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Failed to get Gmail Auth URL", error);
      toast.error("Failed to connect to Google. Please try again.");
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGmail();
      setIsGmailConnected(false);
      toast.success("Gmail disconnected successfully.");
    } catch (error) {
      toast.error("Failed to disconnect Gmail.");
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const response = await api.get("/auth/google/url");
      if (response.data && response.data.url) {
        const popup = window.open(response.data.url, 'Google Calendar Connect', 'width=500,height=600');

        const messageListener = async (event: MessageEvent) => {
          if (event?.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
            setIsCalendarConnected(true);
            window.removeEventListener('message', messageListener);
            toast.success("Google Calendar connected successfully!");
            // Optionally sync immediately: await handleSyncGoogleCalendar();
          }
        };

        window.addEventListener('message', messageListener);
      }
    } catch (error) {
      toast.error("Failed to connect to Google Calendar.");
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      await disconnectGoogleCalendar();
      setIsCalendarConnected(false);
      toast.success("Google Calendar disconnected successfully.");
    } catch (error) {
      toast.error("Failed to disconnect Google Calendar.");
    }
  };

  const handleSyncGoogleCalendar = async () => {
    try {
      toast.info("Syncing calendar events...");
      const res = await syncGoogleCalendar();
      toast.success(`Synced ${res.syncedCount} events successfully.`);
    } catch (error) {
      toast.error("Failed to sync calendar.");
    }
  };

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (!parts.length) return "U";
    return parts.map((part) => part[0].toUpperCase()).join("");
  }, [name]);

  useEffect(() => {
    const load = async () => {
      const localUserName =
        typeof window !== "undefined"
          ? window.localStorage.getItem("userName")
          : "";
      const localUserEmail =
        typeof window !== "undefined"
          ? window.localStorage.getItem("userEmail")
          : "";
      if (localUserName?.trim()) {
        setName(localUserName.trim());
        setDraftName(localUserName.trim());
      }
      if (localUserEmail?.trim()) {
        setEmail(localUserEmail.trim());
        setDraftEmail(localUserEmail.trim());
      }

      try {
        setLoading(true);
        try {
          const gmailStatus = await getGmailConnectionStatus();
          setIsGmailConnected(gmailStatus.isConnected);

          const calendarStatus = await getGoogleCalendarStatus();
          setIsCalendarConnected(calendarStatus.connected);

          const settingsPayload = await getSettings();
          setSettings(settingsPayload);
          applyAppearance(settingsPayload.appearance);
        } catch (error) {
          console.error("Settings fetch failed:", error);
        }

        // Use user context data instead of fetching again
        if (user) {
          setName(user.name || "User");
          setDraftName(user.name || "User");
          setEmail(user.email || "user@example.com");
          setDraftEmail(user.email || "user@example.com");
          
          const userTagline = (user as any).tagline || "";
          setTagline(userTagline);
          setDraftTagline(userTagline);
        }
        if (user?.profilePhoto) {
          setProfilePhoto(user.profilePhoto);
        }
      } catch (error: any) {
        console.error("Failed to load settings", error);
        toast.error("Failed to load settings from backend.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, setIsGmailConnected]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const refreshPermission = () =>
      setNotificationPermission(Notification.permission);
    refreshPermission();
    document.addEventListener("visibilitychange", refreshPermission);

    return () => {
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, []);

  const persistSettings = async (
    nextSettings: SettingsData,
    successMessage?: string,
  ) => {
    const previous = settings;
    setSettings(nextSettings);
    applyAppearance(nextSettings.appearance);
    try {
      const saved = await updateSettings(nextSettings);
      setSettings(saved);
      applyAppearance(saved.appearance);
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      console.error("Failed to update settings", error);
      setSettings(previous);
      applyAppearance(previous.appearance);
      toast.error("Could not save this setting. Reverted.");
    }
  };

  const updateNotificationSetting = async <
    K extends keyof SettingsData["notifications"],
  >(
    key: K,
    value: SettingsData["notifications"][K],
  ) => {
    await persistSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
  };

  const updatePrivacySetting = async <K extends keyof SettingsData["privacy"]>(
    key: K,
    value: SettingsData["privacy"][K],
  ) => {
    await persistSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    });
  };

  const handleSaveProfile = async () => {
    const trimmedName = draftName.trim();
    const normalizedEmail = draftEmail.trim().toLowerCase();
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Please enter a valid email.");
      return;
    }
    try {
      setSaving(true);
      const updated = await profileService.updateProfile({
        name: draftName.trim(),
        email: draftEmail.trim(),
        tagline: draftTagline.trim(),
      });
      setName(updated.name);
      setEmail(updated.email);
      setTagline(updated.tagline || "");
      setDraftName(updated.name);
      setDraftEmail(updated.email);
      setDraftTagline(updated.tagline || "");
      setIsEditingProfile(false);
      window.localStorage.setItem("userName", updated.name);
      window.localStorage.setItem("userEmail", updated.email);
      await refetchProfile();
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      const photoUrl = await profileService.uploadPhoto(file);
      if (photoUrl) setProfilePhoto(photoUrl);
      // Refetch profile to update global user context
      await refetchProfile();
      toast.success("Profile photo updated.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || "Failed to upload profile photo.",
      );
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleResetSettings = async () => {
    try {
      setSaving(true);
      const resetPayload = await resetSettings();
      setSettings(resetPayload);
      applyAppearance(resetPayload.appearance);
      toast.success("Settings reset to defaults.");
    } catch {
      toast.error("Failed to reset settings.");
    } finally {
      setSaving(false);
      setShowResetModal(false);
    }
  };

  const handleClearData = async () => {
    try {
      setSaving(true);
      const message = await clearAllApplicationData();
      toast.success(message);
      setShowClearDataModal(false);
    } catch {
      toast.error("Failed to clear application data.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      await profileService.deleteAccount();
      authService.logout();
      setShowDeleteAccountModal(false);
      toast.success("Account deleted.");
      navigate("/", { replace: true });
    } catch {
      toast.error("Failed to delete account.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutThisDevice = () => {
    authService.logout();
    toast.success("Logged out on this device.");
    navigate("/", { replace: true });
  };

  const requestBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      toast.success("Browser notifications enabled.");
    } else {
      toast.error("Notification permission not granted.");
    }
  };

  const toggleBrowserNotificationChannel = async (enabled: boolean) => {
    await updateNotificationSetting("browserNotifications", enabled);
    if (enabled && notificationPermission !== "granted") {
      toast.info(
        "Allow browser notification permission to receive pop-up alerts.",
      );
    }
  };

  const handleEnableAllNotifications = async () => {
    await persistSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        notificationsEnabled: true,
        remindersEnabled: true,
        browserNotifications: true,
        followUpReminders: true,
        deadlineAlerts: true,
        interviewReminders: true,
      },
    });
    if (Notification.permission !== "granted" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        toast.success("All notifications and browser alerts enabled.");
      } else {
        toast.info("All internal alerts enabled, but browser notifications were blocked.");
      }
    } else {
      toast.success("All notifications enabled.");
    }
  };

  const handleDisableAllNotifications = async () => {
    await persistSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        notificationsEnabled: false,
        remindersEnabled: false,
        browserNotifications: false,
        followUpReminders: false,
        deadlineAlerts: false,
        interviewReminders: false,
      },
    });
    toast.success("All notifications disabled.");
  };

  return (
    <div className="ml-60 min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="px-8 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-6">
              <div className="min-w-0">
                <h1
                  className="text-3xl font-bold text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Settings
                </h1>
                <p className="text-sm text-card-foreground opacity-70">
                  Manage your account, reminders, and security controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">

      {loading && (
        <div
          className="mb-8 rounded-xl bg-card p-5 text-card-foreground/70 shadow-sm"
          style={{ fontFamily: "Outfit" }}
        >
          Loading your saved settings...
        </div>
      )}

      <div className="app-card-grid grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2">
        {/* LEFT COLUMN */}
        <div className="space-y-8">
          <SectionCard
            icon={<User size={22} />}
            title="Account Settings"
            subtitle="Manage your profile information"
          >
            <div className="mb-5 flex items-center gap-4 border-b border-gray-100 pb-5">
              <div className="relative">
                {currentProfilePhoto ? (
                  <img
                    src={currentProfilePhoto}
                    alt="Profile"
                    className="h-20 w-20 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FCA311] text-2xl font-bold text-card-foreground">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-secondary text-secondary-foreground"
                >
                  <Camera size={14} className="text-[#FCA311]" />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePhotoUpload}
                />
              </div>
              <div className="flex flex-1 items-start justify-between">
                <div>
                  <h3
                    className="text-lg font-semibold text-card-foreground"
                    style={{ fontFamily: "Outfit" }}
                  >
                    {name}
                  </h3>
                  <p className="text-sm text-card-foreground/50">{email}</p>
                </div>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    disabled={saving}
                    className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-card-foreground shadow-sm transition-all hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-[#FCA311] disabled:opacity-60"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  Full Name
                </label>
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  readOnly={!isEditingProfile}
                  className={`w-full rounded-lg border px-4 py-2.5 text-card-foreground ${
                    isEditingProfile
                      ? "border-border focus:border-[#FCA311] focus:outline-none focus:ring-2 focus:ring-[#FCA311]/30"
                      : "cursor-not-allowed border-border bg-muted/50"
                  }`}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  value={draftEmail}
                  onChange={(event) => setDraftEmail(event.target.value)}
                  readOnly={!isEditingProfile}
                  className={`w-full rounded-lg border px-4 py-2.5 text-card-foreground ${
                    isEditingProfile
                      ? "border-border focus:border-[#FCA311] focus:outline-none focus:ring-2 focus:ring-[#FCA311]/30"
                      : "cursor-not-allowed border-border bg-muted/50"
                  }`}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  Tagline (e.g. Job Seeker)
                </label>
                <input
                  type="text"
                  value={draftTagline}
                  onChange={(event) => setDraftTagline(event.target.value)}
                  readOnly={!isEditingProfile}
                  placeholder="Job Seeker"
                  className={`w-full rounded-lg border px-4 py-2.5 text-card-foreground ${
                    isEditingProfile
                      ? "border-border focus:border-[#FCA311] focus:outline-none focus:ring-2 focus:ring-[#FCA311]/30"
                      : "cursor-not-allowed border-border bg-muted/50"
                  }`}
                />
              </div>
              {isEditingProfile && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="rounded-lg bg-secondary text-secondary-foreground px-4 py-3 font-medium transition-all hover:bg-[#1a2a4f] disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(name);
                      setDraftEmail(email);
                      setDraftTagline(tagline);
                      setIsEditingProfile(false);
                    }}
                    disabled={saving}
                    className="rounded-lg border border-border px-4 py-3 font-medium text-card-foreground transition-all hover:bg-muted disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="pt-4 border-t border-gray-100 space-y-3 mt-6">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-gray-100 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-card-foreground" />
                    <span className="font-medium text-card-foreground">
                      {isUploadingPhoto ? "Uploading..." : "Upload Profile Picture"}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={onManageResumesOpen}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-card-foreground" />
                    <span className="font-medium text-card-foreground">Manage Resumes</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={onSocialPortfolioOpen}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-card-foreground" />
                    <span className="font-medium text-card-foreground">Social & Portfolio</span>
                  </div>
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Mail size={22} />}
            title="Integrations"
            subtitle="Connect external accounts for automated tracking"
          >
            <div className="rounded-lg border border-gray-100 bg-muted/50/50 p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3
                    className="font-semibold text-card-foreground"
                    style={{ fontFamily: "Outfit" }}
                  >
                    Gmail Auto-Tracking
                  </h3>
                  <p className="mt-1 text-sm text-card-foreground/70">
                    Allow Mirae to automatically update your application
                    statuses by securely analyzing new emails. Emails are never
                    stored.
                  </p>
                </div>
                {isGmailConnected && (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    <CheckCircle size={14} />
                    Connected
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-4">
                {isGmailConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectGmail}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-600 transition-all hover:bg-red-100"
                  >
                    Disconnect Gmail
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    className="w-full rounded-lg bg-secondary text-secondary-foreground px-4 py-3 font-medium transition-all hover:bg-[#1a2a4f]"
                  >
                    Connect Gmail Account
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-100 bg-muted/50/50 p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3
                    className="font-semibold text-card-foreground"
                    style={{ fontFamily: "Outfit" }}
                  >
                    Google Calendar Sync
                  </h3>
                  <p className="mt-1 text-sm text-card-foreground/70">
                    Automatically sync your interviews and deadlines to your primary Google Calendar.
                  </p>
                </div>
                {isCalendarConnected && (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    <CheckCircle size={14} />
                    Connected
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-4">
                {isCalendarConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSyncGoogleCalendar}
                      className="w-full rounded-lg border border-border bg-card px-4 py-3 font-medium text-card-foreground transition-all hover:bg-muted/50"
                    >
                      Sync Now
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGoogleCalendar}
                      className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-600 transition-all hover:bg-red-100"
                    >
                      Disconnect Calendar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogleCalendar}
                    className="w-full rounded-lg bg-secondary text-secondary-foreground px-4 py-3 font-medium transition-all hover:bg-[#1a2a4f]"
                  >
                    Connect Google Calendar
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<SettingsIcon size={22} />}
            title="General Settings"
            subtitle="App preferences and general options"
          >
            <div className="space-y-3">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-card-foreground" />
                  <span className="font-medium text-card-foreground">Theme (Dark/Light)</span>
                </div>
                <div
                  onClick={async (e) => {
                    e.stopPropagation();
                    toggleTheme();
                    const newTheme = !isDarkMode ? "dark" : "light";
                    await persistSettings({
                      ...settings,
                      appearance: {
                        ...settings.appearance,
                        theme: newTheme,
                      },
                    });
                  }}
                  className={`w-10 h-5 rounded-full transition-all cursor-pointer flex items-center px-0.5 ${
                    isDarkMode ? 'bg-[#FCA311]' : 'bg-background'
                  }`}
                >
                  <motion.div
                    animate={{ x: isDarkMode ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-4 h-4 bg-card rounded-full shadow-md"
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => toast.info("Help & Community is coming soon!")}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-card-foreground" />
                  <span className="font-medium text-card-foreground">Help & Community</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem("token");
                  window.localStorage.removeItem("userName");
                  window.localStorage.removeItem("isLoggedIn");
                  window.location.href = "/";
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-[#E11D48]" />
                  <span className="font-medium text-[#E11D48]">Logout</span>
                </div>
              </button>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          <SectionCard
            icon={<Bell size={22} />}
            title={
              <div className="flex items-center gap-3">
                <span>Notifications</span>
                {(settings.notifications.browserNotifications ||
                  settings.notifications.followUpReminders ||
                  settings.notifications.deadlineAlerts ||
                  settings.notifications.interviewReminders) ? (
                  <span className="rounded-md bg-green-50 px-2.5 py-0.5 text-sm font-medium text-green-600 border border-green-100">
                    Enabled
                  </span>
                ) : (
                  <span className="rounded-md bg-red-50 px-2.5 py-0.5 text-sm font-medium text-red-600 border border-red-100">
                    Disabled
                  </span>
                )}
              </div>
            }
            subtitle="Reminders and schedule-aware alerts"
          >
            <div className="mb-4 border-b border-gray-100 pb-4">
              <ToggleRow
                label="Browser pop-up notifications"
                checked={settings.notifications.browserNotifications}
                onCheckedChange={toggleBrowserNotificationChannel}
              />
              <ToggleRow
                label="Follow-up reminders"
                checked={settings.notifications.followUpReminders}
                onCheckedChange={(value) =>
                  updateNotificationSetting("followUpReminders", value)
                }
              />
              <ToggleRow
                label="Deadline alerts"
                checked={settings.notifications.deadlineAlerts}
                onCheckedChange={(value) =>
                  updateNotificationSetting("deadlineAlerts", value)
                }
              />
              <ToggleRow
                label="Interview reminders"
                checked={settings.notifications.interviewReminders}
                onCheckedChange={(value) =>
                  updateNotificationSetting("interviewReminders", value)
                }
              />
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleEnableAllNotifications}
                  className="w-full rounded-lg bg-secondary text-secondary-foreground px-4 py-3 font-medium hover:bg-[#1a2a4f] transition-colors"
                >
                  Enable All Notifications
                </button>
                <button
                  type="button"
                  onClick={handleDisableAllNotifications}
                  className="w-full rounded-lg border border-[#14213D] px-4 py-3 font-medium text-card-foreground hover:bg-[#f3f4f6] transition-colors"
                >
                  Disable All Notifications
                </button>
              </div>
              <p className="text-xs text-card-foreground/60 pt-2">
                To fully revoke browser permission after enabling, open browser
                site settings for this app and change Notifications to Block.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Lock size={22} />}
            title="Privacy & Security"
            subtitle="Data and account safety controls"
          >
            <div className="space-y-4">
              <ToggleRow
                label="Security activity alerts"
                checked={settings.privacy.securityActivityAlerts}
                onCheckedChange={(value) =>
                  updatePrivacySetting("securityActivityAlerts", value)
                }
              />
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-[#14213D] text-card-foreground hover:bg-secondary text-secondary-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5" />
                  <span className="font-medium">Change Password</span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogoutThisDevice}
                className="w-full rounded-lg border border-border px-4 py-3 font-medium text-card-foreground hover:bg-muted/50 transition-colors"
              >
                Logout on this device
              </button>
            </div>
          </SectionCard>

          <SectionCard
            icon={<AlertTriangle size={22} />}
            title="Danger Zone"
            subtitle="Permanent and irreversible actions"
            danger
          >
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowClearDataModal(true)}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#DC6B6B] px-4 py-3 font-medium text-white hover:bg-[#c95555] disabled:opacity-60"
              >
                <UserX size={18} />
                Delete All Application Data
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#DC6B6B] px-4 py-3 font-medium text-[#DC6B6B] hover:bg-[#DC6B6B] hover:text-white"
              >
                <AlertTriangle size={18} />
                Delete Account
              </button>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#DC6B6B] px-4 py-3 font-medium text-[#DC6B6B] hover:bg-[#DC6B6B] hover:text-white"
              >
                <RotateCcw size={18} />
                Reset Settings to Default
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
      </div>

      <AnimatePresence>
        {showPasswordModal && (
          <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteAccountModal && (
          <ConfirmationModal
            title="Delete Account"
            message="This action is permanent. Your account and related data will be deleted."
            confirmText="Yes, Delete Account"
            onClose={() => setShowDeleteAccountModal(false)}
            onConfirm={handleDeleteAccount}
            danger
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearDataModal && (
          <ConfirmationModal
            title="Delete All Application Data"
            message="This will permanently remove all your tracked applications and related data."
            confirmText="Yes, Clear Data"
            onClose={() => setShowClearDataModal(false)}
            onConfirm={handleClearData}
            danger
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetModal && (
          <ConfirmationModal
            title="Reset Settings to Default"
            message="This will reset all settings to default values."
            confirmText="Yes, Reset"
            onClose={() => setShowResetModal(false)}
            onConfirm={handleResetSettings}
            danger
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const message = await profileService.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success(message || "Password updated successfully.");
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to change password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalFrame title="Change Password" onClose={onClose}>
      <div className="space-y-3">
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Current password"
          className="w-full rounded-lg border border-border px-4 py-3"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="New password"
          className="w-full rounded-lg border border-border px-4 py-3"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
          className="w-full rounded-lg border border-border px-4 py-3"
        />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="px-5 py-2.5 font-semibold text-card-foreground disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-lg bg-[#FCA311] px-5 py-2.5 font-semibold text-foreground disabled:opacity-60"
        >
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </div>
    </ModalFrame>
  );
}

function ConfirmationModal({
  title,
  message,
  confirmText,
  onClose,
  onConfirm,
  danger,
}: {
  title: string;
  message: string;
  confirmText: string;
  onClose: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <ModalFrame title={title} onClose={onClose} danger={danger}>
      <p className="text-card-foreground/70">{message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2.5 font-semibold text-card-foreground"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-5 py-2.5 font-semibold ${danger ? "bg-[#DC6B6B] text-white" : "bg-[#FCA311] text-foreground"}`}
        >
          {confirmText}
        </button>
      </div>
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  onClose,
  children,
  danger,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0B132B]/60 p-8"
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[480px] rounded-xl bg-card shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2
            className={`text-2xl font-bold ${danger ? "text-[#DC6B6B]" : "text-card-foreground"}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#FCA311] hover:text-[#fdb748]"
          >
            <X size={22} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}
