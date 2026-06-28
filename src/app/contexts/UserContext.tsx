import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { profileService, ProfileData } from "../services/profileService";

interface UserContextType {
  user: ProfileData | null;
  loading: boolean;
  error: string | null;
  refetchProfile: () => Promise<void>;
  isGmailConnected: boolean;
  setIsGmailConnected: (status: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  const fetchProfile = async () => {
    // Only fetch if user is logged in
    const isLoggedIn =
      typeof window !== "undefined" &&
      localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) return;

    setLoading(true);
    setError(null);

    try {
      const profileData = await profileService.getProfile();
      setUser(profileData);

      // Update localStorage with latest userName for consistency
      if (profileData.name) {
        localStorage.setItem("userName", profileData.name);
      }
      if (profileData.email) {
        localStorage.setItem("userEmail", profileData.email);
      }
      if (profileData.profilePhoto) {
        localStorage.setItem("userProfilePhoto", profileData.profilePhoto);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const refetchProfile = async () => {
    await fetchProfile();
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const value: UserContextType = {
    user,
    loading,
    error,
    refetchProfile,
    isGmailConnected,
    setIsGmailConnected,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
