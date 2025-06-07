import Conf from "conf";
import type { CLIConfig } from "../types";

// Default configuration
const defaultConfig: CLIConfig = {
  checkFrequency: "daily",
  showAnnouncements: true,
  readAnnouncements: [],
};

// Configuration object
const config = new Conf<CLIConfig>({
  projectName: "voltagent",
  defaults: defaultConfig,
});

// Get configuration
export const getConfig = (): CLIConfig => {
  return config.store;
};

// Update configuration
export const updateConfig = (newConfig: Partial<CLIConfig>): CLIConfig => {
  const currentConfig = getConfig();
  const updatedConfig = { ...currentConfig, ...newConfig };

  for (const [key, value] of Object.entries(updatedConfig)) {
    config.set(key, value);
  }

  return getConfig();
};

// Mark announcement as read
export const markAnnouncementAsRead = (announcementId: string): void => {
  const currentConfig = getConfig();
  const readAnnouncements = [...currentConfig.readAnnouncements];

  if (!readAnnouncements.includes(announcementId)) {
    readAnnouncements.push(announcementId);
    updateConfig({ readAnnouncements });
  }
};

// Update last check time
export const updateLastCheckTime = (): void => {
  updateConfig({ lastCheck: Date.now() });
};

// Check if updates should be checked
export const shouldCheckForUpdates = (): boolean => {
  const { checkFrequency, lastCheck } = getConfig();

  if (checkFrequency === "never") return false;
  if (!lastCheck) return true;

  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  const weekInMs = 7 * dayInMs;

  switch (checkFrequency) {
    case "startup":
      return true;
    case "daily":
      return now - lastCheck > dayInMs;
    case "weekly":
      return now - lastCheck > weekInMs;
    default:
      return false;
  }
};
