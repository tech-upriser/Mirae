import { motion } from "motion/react";
import {
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

interface IntegrationStatusProps {
  isConnected: boolean;
  lastSynced?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function IntegrationStatus({
  isConnected,
  lastSynced,
  onConnect,
  onDisconnect,
}: IntegrationStatusProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate a refresh delay, replace with actual API call later
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isConnected
                ? "bg-green-100 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Mail size={24} />
          </div>

          <div>
            <h3
              className="text-lg font-bold text-card-foreground"
              style={{ fontFamily: "Outfit" }}
            >
              Gmail Auto-Tracking
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {isConnected ? (
                <>
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    Active
                  </span>
                  {lastSynced && (
                    <span className="text-xs text-muted-foreground">
                      • Last checked: {lastSynced}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Not Connected
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <button
                onClick={handleRefresh}
                className="p-2 text-muted-foreground hover:text-card-foreground transition-colors"
                title="Force Sync"
              >
                <RefreshCw
                  size={18}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={onDisconnect}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              className="group flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground transition-colors hover:bg-[#1a2a4f]"
            >
              Connect Account
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
