import { createTool } from "@voltagent/core";
import { z } from "zod";

// Define schemas for calendar event data
const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  time: z.string(),
  duration: z.number(),
});

// Define output schemas for calendar tools
const checkCalendarOutputSchema = z.object({
  events: z.array(calendarEventSchema),
  message: z.string(),
});

const addCalendarEventOutputSchema = z.object({
  event: calendarEventSchema,
  message: z.string(),
});

// Mock calendar database for demonstration
const mockCalendar = [
  {
    id: "1",
    title: "Team meeting",
    date: "2023-11-15",
    time: "10:00",
    duration: 60,
  },
  {
    id: "2",
    title: "Lunch with client",
    date: "2023-11-15",
    time: "12:30",
    duration: 90,
  },
  {
    id: "3",
    title: "Project deadline",
    date: "2023-11-20",
    time: "17:00",
    duration: 0,
  },
];

/**
 * A tool for checking calendar events
 * With output schema validation to ensure consistent response format
 */
export const checkCalendarTool = createTool({
  name: "checkCalendar",
  description: "Check calendar events for a specific date",
  parameters: z.object({
    date: z.string().describe("The date to check calendar events for (YYYY-MM-DD)"),
  }),
  outputSchema: checkCalendarOutputSchema,
  execute: async ({ date }) => {
    const events = mockCalendar.filter((event) => event.date === date);

    if (events.length === 0) {
      return {
        events: [],
        message: `No events found for ${date}.`,
      };
    }

    return {
      events,
      message: `Found ${events.length} events for ${date}: ${events
        .map((event) => `${event.title} at ${event.time}`)
        .join(", ")}`,
    };
  },
});

/**
 * A tool for adding a calendar event
 * With output schema validation to ensure consistent response format
 */
export const addCalendarEventTool = createTool({
  name: "addCalendarEvent",
  description: "Add a new event to the calendar",
  parameters: z.object({
    title: z.string().describe("The title of the event"),
    date: z.string().describe("The date of the event (YYYY-MM-DD)"),
    time: z.string().describe("The time of the event (HH:MM)"),
    duration: z.number().describe("The duration of the event in minutes"),
  }),
  outputSchema: addCalendarEventOutputSchema,
  execute: async ({ title, date, time, duration }) => {
    const id = (mockCalendar.length + 1).toString();
    const newEvent = { id, title, date, time, duration };

    // In a real implementation, this would add to a database
    mockCalendar.push(newEvent);

    return {
      event: newEvent,
      message: `Added new event: "${title}" on ${date} at ${time} for ${duration} minutes.`,
    };
  },
});
