/**
 * CLI Announcements - Fetch and display announcements from GitHub
 */

import { colors } from "./server-utils";

export interface CLIAnnouncement {
  id: string;
  date: string;
  title: string;
  description: string;
  url?: string;
  version?: string;
  enabled: boolean;
}

const ANNOUNCEMENTS_URL =
  "https://raw.githubusercontent.com/VoltAgent/voltagent/refs/heads/main/announcements.json";

/**
 * Fetch announcements from GitHub
 */
export async function fetchAnnouncements(): Promise<CLIAnnouncement[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(ANNOUNCEMENTS_URL, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { announcements?: CLIAnnouncement[] };
    return data.announcements || [];
  } catch {
    // Silently fail - don't interrupt server startup
    return [];
  }
}

/**
 * Print announcements to console (minimal single-line format)
 */
export function printAnnouncements(announcements: CLIAnnouncement[]): void {
  const enabledAnnouncements = announcements.filter((a) => a.enabled);

  if (enabledAnnouncements.length === 0) {
    return;
  }

  console.log();
  for (const announcement of enabledAnnouncements) {
    const url = announcement.url ? ` ${colors.dim}→${colors.reset} ${announcement.url}` : "";
    console.log(
      `  ${colors.yellow}⚡${colors.reset} ${colors.bright}${announcement.title}${colors.reset}${url}`,
    );
  }
}

/**
 * Fetch and print announcements (non-blocking)
 */
export async function showAnnouncements(): Promise<void> {
  const announcements = await fetchAnnouncements();
  printAnnouncements(announcements);
}
