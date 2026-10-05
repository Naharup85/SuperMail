import type { ScheduleConfig } from "@/types/automations";

/**
 * Validates if a timezone string is a valid IANA timezone identifier.
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates schedule configuration and timezone.
 */
export function validateSchedule(
  schedule: ScheduleConfig,
  timezone: string,
): { valid: boolean; error?: string } {
  if (!timezone || !isValidTimezone(timezone)) {
    return {
      valid: false,
      error: `Invalid or missing timezone: '${timezone}'. Please specify a valid IANA timezone (e.g. 'Asia/Kolkata', 'America/New_York', 'UTC').`,
    };
  }

  if (!schedule || !schedule.type) {
    return { valid: false, error: "Schedule type is required." };
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  switch (schedule.type) {
    case "daily":
    case "weekdays": {
      if (!schedule.time || !timeRegex.test(schedule.time)) {
        return {
          valid: false,
          error: "Schedule requires a valid time in HH:MM (24-hour) format (e.g. '09:00').",
        };
      }
      return { valid: true };
    }

    case "weekly": {
      if (!schedule.time || !timeRegex.test(schedule.time)) {
        return {
          valid: false,
          error: "Weekly schedule requires a valid time in HH:MM (24-hour) format (e.g. '17:00').",
        };
      }
      if (
        !Array.isArray(schedule.daysOfWeek) ||
        schedule.daysOfWeek.length === 0 ||
        schedule.daysOfWeek.some((d) => typeof d !== "number" || d < 0 || d > 6)
      ) {
        return {
          valid: false,
          error: "Weekly schedule requires at least one valid day of week (0=Sunday ... 6=Saturday).",
        };
      }
      return { valid: true };
    }

    case "one_time": {
      if (!schedule.datetime) {
        return { valid: false, error: "One-time schedule requires an ISO datetime string." };
      }
      const parsed = new Date(schedule.datetime);
      if (isNaN(parsed.getTime())) {
        return { valid: false, error: "Invalid datetime format for one-time schedule." };
      }
      return { valid: true };
    }

    case "custom_cron": {
      if (!schedule.cron || typeof schedule.cron !== "string") {
        return { valid: false, error: "Custom cron schedule requires a cron expression string." };
      }
      const parts = schedule.cron.trim().split(/\s+/);
      if (parts.length !== 5) {
        return { valid: false, error: "Custom cron expression must contain exactly 5 fields." };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: `Unsupported schedule type: '${(schedule as { type: string }).type}'.` };
  }
}

/**
 * Gets parts of a date in a specific timezone.
 */
function getDatePartsInTimezone(date: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour === "24" ? "0" : map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
    weekday: weekdayMap[map.weekday] ?? 0,
  };
}

/**
 * Constructs a UTC Date for a given year, month, day, hour, minute in the specified timezone.
 */
function createDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  // Calculate offset for target timezone at this time
  const testUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const tzParts = getDatePartsInTimezone(testUtc, timezone);
  const diffMs =
    Date.UTC(tzParts.year, tzParts.month - 1, tzParts.day, tzParts.hour, tzParts.minute, tzParts.second) -
    testUtc.getTime();

  return new Date(testUtc.getTime() - diffMs);
}

/**
 * Calculates the next execution Date (in UTC) for an automation schedule.
 */
export function calculateNextRun(
  schedule: ScheduleConfig,
  timezone: string,
  fromDate: Date = new Date(),
): Date | null {
  const val = validateSchedule(schedule, timezone);
  if (!val.valid) return null;

  const currentTz = getDatePartsInTimezone(fromDate, timezone);

  switch (schedule.type) {
    case "one_time": {
      const target = new Date(schedule.datetime!);
      return target.getTime() > fromDate.getTime() ? target : null;
    }

    case "daily": {
      const [hStr, mStr] = schedule.time!.split(":");
      const targetH = parseInt(hStr, 10);
      const targetM = parseInt(mStr, 10);

      // Check if target time today is in the future
      let runDate = createDateInTimezone(
        currentTz.year,
        currentTz.month,
        currentTz.day,
        targetH,
        targetM,
        timezone,
      );

      if (runDate.getTime() <= fromDate.getTime()) {
        // Move to tomorrow
        const tomorrow = new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
        const tomTz = getDatePartsInTimezone(tomorrow, timezone);
        runDate = createDateInTimezone(
          tomTz.year,
          tomTz.month,
          tomTz.day,
          targetH,
          targetM,
          timezone,
        );
      }

      return runDate;
    }

    case "weekdays": {
      const [hStr, mStr] = schedule.time!.split(":");
      const targetH = parseInt(hStr, 10);
      const targetM = parseInt(mStr, 10);

      for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
        const candidate = new Date(fromDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const candTz = getDatePartsInTimezone(candidate, timezone);

        // Weekdays: 1 (Mon) through 5 (Fri)
        if (candTz.weekday >= 1 && candTz.weekday <= 5) {
          const runDate = createDateInTimezone(
            candTz.year,
            candTz.month,
            candTz.day,
            targetH,
            targetM,
            timezone,
          );

          if (runDate.getTime() > fromDate.getTime()) {
            return runDate;
          }
        }
      }
      return null;
    }

    case "weekly": {
      const [hStr, mStr] = schedule.time!.split(":");
      const targetH = parseInt(hStr, 10);
      const targetM = parseInt(mStr, 10);
      const days = schedule.daysOfWeek || [];

      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const candidate = new Date(fromDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const candTz = getDatePartsInTimezone(candidate, timezone);

        if (days.includes(candTz.weekday)) {
          const runDate = createDateInTimezone(
            candTz.year,
            candTz.month,
            candTz.day,
            targetH,
            targetM,
            timezone,
          );

          if (runDate.getTime() > fromDate.getTime()) {
            return runDate;
          }
        }
      }
      return null;
    }

    case "custom_cron": {
      // Basic cron evaluation: minute hour dom month dow
      const [mField, hField, , , dowField] = schedule.cron!.trim().split(/\s+/);
      const targetM = mField === "*" ? 0 : parseInt(mField, 10);
      const targetH = hField === "*" ? 0 : parseInt(hField, 10);

      // Check next 14 days
      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const candidate = new Date(fromDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const candTz = getDatePartsInTimezone(candidate, timezone);

        let matchesDow = true;
        if (dowField !== "*") {
          if (dowField === "1-5") {
            matchesDow = candTz.weekday >= 1 && candTz.weekday <= 5;
          } else {
            const allowedDows = dowField.split(",").map((d) => parseInt(d, 10));
            matchesDow = allowedDows.includes(candTz.weekday);
          }
        }

        if (matchesDow) {
          const runDate = createDateInTimezone(
            candTz.year,
            candTz.month,
            candTz.day,
            isNaN(targetH) ? 0 : targetH,
            isNaN(targetM) ? 0 : targetM,
            timezone,
          );

          if (runDate.getTime() > fromDate.getTime()) {
            return runDate;
          }
        }
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Formats a ScheduleConfig into human-readable text.
 */
export function formatScheduleDescription(
  schedule: ScheduleConfig,
  timezone: string,
): string {
  if (!schedule) return "Unscheduled";

  const formatTime12h = (hhmm?: string) => {
    if (!hhmm) return "";
    const [hStr, mStr] = hhmm.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  switch (schedule.type) {
    case "daily":
      return `Every day at ${formatTime12h(schedule.time)} (${timezone})`;

    case "weekdays":
      return `Every weekday at ${formatTime12h(schedule.time)} (${timezone})`;

    case "weekly": {
      const days = (schedule.daysOfWeek || []).map((d) => dayNames[d]).join(", ");
      return `Every ${days || "week"} at ${formatTime12h(schedule.time)} (${timezone})`;
    }

    case "one_time": {
      if (!schedule.datetime) return `One-time (${timezone})`;
      try {
        const d = new Date(schedule.datetime);
        const formatted = d.toLocaleString("en-US", {
          timeZone: timezone,
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        return `One-time on ${formatted} (${timezone})`;
      } catch {
        return `One-time (${timezone})`;
      }
    }

    case "custom_cron":
      return `Cron: ${schedule.cron} (${timezone})`;

    default:
      return `Custom schedule (${timezone})`;
  }
}

/**
 * Natural language helper for parsing common schedule descriptions into structured ScheduleConfig.
 */
export function parseNaturalSchedule(
  text: string,
  defaultTimezone: string = "Asia/Kolkata",
): { schedule: ScheduleConfig; timezone: string } | null {
  const lower = text.toLowerCase().trim();

  // Extract time e.g., "9 am", "9:30 am", "5 pm", "17:00", "9:00"
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  let timeStr = "09:00";

  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];

    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;

    timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  // Weekdays (Monday through Friday)
  if (lower.includes("weekday") || lower.includes("workday") || lower.includes("mon-fri") || lower.includes("monday to friday")) {
    return {
      schedule: {
        type: "weekdays",
        time: timeStr,
      },
      timezone: defaultTimezone,
    };
  }

  // Specific Day of Week e.g., Friday
  const daysMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const [dayName, dayNum] of Object.entries(daysMap)) {
    if (lower.includes(`every ${dayName}`) || lower.includes(`each ${dayName}`) || lower.includes(`on ${dayName}`)) {
      return {
        schedule: {
          type: "weekly",
          time: timeStr,
          daysOfWeek: [dayNum],
        },
        timezone: defaultTimezone,
      };
    }
  }

  // One-time "Tomorrow at..."
  if (lower.includes("tomorrow") || lower.includes("next day")) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tzParts = getDatePartsInTimezone(tomorrow, defaultTimezone);
    const [hStr, mStr] = timeStr.split(":");
    const targetDate = createDateInTimezone(
      tzParts.year,
      tzParts.month,
      tzParts.day,
      parseInt(hStr, 10),
      parseInt(mStr, 10),
      defaultTimezone,
    );

    return {
      schedule: {
        type: "one_time",
        datetime: targetDate.toISOString(),
      },
      timezone: defaultTimezone,
    };
  }

  // Daily / Every morning / Every day
  if (lower.includes("every day") || lower.includes("daily") || lower.includes("every morning") || lower.includes("every evening")) {
    return {
      schedule: {
        type: "daily",
        time: timeStr,
      },
      timezone: defaultTimezone,
    };
  }

  // Default fallback to daily with extracted time
  return {
    schedule: {
      type: "daily",
      time: timeStr,
    },
    timezone: defaultTimezone,
  };
}
