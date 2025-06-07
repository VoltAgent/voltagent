import boxen from "boxen";
import chalk from "chalk";
import type { Announcement } from "../types";

// Mock announcements - will be fetched from API in the real implementation
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-001",
    title: "New version: VoltAgent v0.2.0",
    message:
      "New version of VoltAgent is released! Contains new features and performance improvements.",
    severity: "info",
    date: "2023-11-15",
    readStatus: false,
  },
  {
    id: "ann-002",
    title: "Documentation Update",
    message:
      "Our new documentation page is live. Detailed examples and new tutorial videos have been added.",
    severity: "info",
    date: "2023-11-20",
    readStatus: false,
  },
  {
    id: "ann-003",
    title: "Security Update",
    message:
      "An important security vulnerability has been fixed. Please update as soon as possible.",
    severity: "critical",
    date: "2023-11-25",
    readStatus: false,
    url: "https://voltagent.dev/security/CVE-2023-001",
  },
];

// Get announcements
export const getAnnouncements = async (): Promise<Announcement[]> => {
  // Will be fetched from API in the real implementation
  return MOCK_ANNOUNCEMENTS;
};

// Get unread announcements
export const getUnreadAnnouncements = async (readIds: string[] = []): Promise<Announcement[]> => {
  const announcements = await getAnnouncements();
  return announcements.filter((announcement) => !readIds.includes(announcement.id));
};

// Format announcements and display them
export const formatAnnouncements = (announcements: Announcement[]): string => {
  if (announcements.length === 0) {
    return chalk.green("✓ No new announcements.");
  }

  const formattedAnnouncements = announcements
    .map((announcement) => {
      const severityColor = {
        info: chalk.blue,
        warning: chalk.yellow,
        critical: chalk.red,
      }[announcement.severity];

      const title = severityColor(`${announcement.title}`);
      const message = `${announcement.message}`;
      const date = chalk.gray(`Date: ${announcement.date}`);
      const url = announcement.url ? chalk.cyan(`\nLink: ${announcement.url}`) : "";

      return `${title}\n${message}\n${date}${url}`;
    })
    .join("\n\n");

  return boxen(formattedAnnouncements, {
    padding: 1,
    margin: 1,
    borderColor: "cyan",
    title: "VoltAgent Announcements",
    titleAlignment: "center",
  });
};

// Print announcements to console
export const printAnnouncements = async (readIds: string[] = []): Promise<void> => {
  const announcements = await getUnreadAnnouncements(readIds);
  console.log(formatAnnouncements(announcements));
};
