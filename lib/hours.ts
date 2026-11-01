const ORDER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
type Day = (typeof ORDER)[number];

type Range = { start: number; end: number };

const DAY_NAMES: Record<string, Day> = {
  mo: "Mo",
  tu: "Tu",
  we: "We",
  th: "Th",
  fr: "Fr",
  sa: "Sa",
  su: "Su",
  mon: "Mo",
  tue: "Tu",
  wed: "We",
  thu: "Th",
  fri: "Fr",
  sat: "Sa",
  sun: "Su",
};

function normDay(value: string): Day | null {
  return DAY_NAMES[value.toLowerCase()] ?? null;
}

function expandDays(spec: string): Day[] | null {
  const parts = spec.split(",").map((part) => part.trim()).filter(Boolean);
  const days: Day[] = [];
  for (const part of parts) {
    const range = part.split("-").map((piece) => piece.trim());
    if (range.length === 1) {
      const day = normDay(range[0]);
      if (!day) return null;
      days.push(day);
      continue;
    }
    if (range.length !== 2) return null;
    const start = normDay(range[0]);
    const end = normDay(range[1]);
    if (!start || !end) return null;
    let index = ORDER.indexOf(start);
    const last = ORDER.indexOf(end);
    for (let guard = 0; guard < 8; guard += 1) {
      days.push(ORDER[index]);
      if (index === last) break;
      index = (index + 1) % 7;
    }
  }
  return [...new Set(days)];
}

function parseRanges(spec: string): Range[] | null {
  const chunks = spec.split(",").map((chunk) => chunk.trim()).filter(Boolean);
  if (chunks.length === 0) return null;
  const ranges: Range[] = [];
  for (const chunk of chunks) {
    const match = chunk.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const start = Number(match[1]) * 60 + Number(match[2]);
    const end = Number(match[3]) * 60 + Number(match[4]);
    if (start > 24 * 60 || end > 24 * 60 || Number(match[2]) > 59 || Number(match[4]) > 59) {
      return null;
    }
    ranges.push({ start, end });
  }
  return ranges;
}

function parseSchedule(spec: string): Map<Day, Range[]> | null {
  const cleaned = spec.replace(/\bPH\b/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (/week\s|sunrise|sunset|\bSH\b|\+|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(cleaned)) {
    return null;
  }
  const schedule = new Map<Day, Range[]>(ORDER.map((day) => [day, []]));
  if (/^24\s*\/\s*7$/.test(cleaned)) {
    const allDay = [{ start: 0, end: 24 * 60 }];
    for (const day of ORDER) schedule.set(day, allDay);
    return schedule;
  }

  const rules = cleaned.split(";").map((rule) => rule.trim()).filter(Boolean);
  let recognized = false;
  for (const rule of rules) {
    if (/^\d/.test(rule)) {
      const ranges = parseRanges(rule);
      if (!ranges) return null;
      for (const day of ORDER) schedule.set(day, ranges);
      recognized = true;
      continue;
    }
    const match = rule.match(
      /^([A-Za-z]{2,3}(?:\s*-\s*[A-Za-z]{2,3})?(?:\s*,\s*[A-Za-z]{2,3}(?:\s*-\s*[A-Za-z]{2,3})?)*)\s+(.+)$/,
    );
    if (!match) return null;
    const days = expandDays(match[1]);
    if (!days) return null;
    const rest = match[2].trim().toLowerCase();
    if (rest === "off" || rest === "closed") {
      for (const day of days) schedule.set(day, []);
      recognized = true;
      continue;
    }
    const ranges = parseRanges(rest);
    if (!ranges) return null;
    for (const day of days) schedule.set(day, ranges);
    recognized = true;
  }
  return recognized ? schedule : null;
}

export function houstonClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday: Record<string, Day> = {
    Sun: "Su",
    Mon: "Mo",
    Tue: "Tu",
    Wed: "We",
    Thu: "Th",
    Fri: "Fr",
    Sat: "Sa",
  };
  const day = weekday[read("weekday")];
  const hour = Number(read("hour")) % 24;
  const minute = Number(read("minute"));
  if (!day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { day, minutes: hour * 60 + minute };
}

function previousDay(day: Day): Day {
  return ORDER[(ORDER.indexOf(day) + 6) % 7];
}

function isOpenAt(day: Day, minutes: number, schedule: Map<Day, Range[]>) {
  for (const range of schedule.get(day) ?? []) {
    if (range.end > range.start && minutes >= range.start && minutes < range.end) return true;
    if (range.end < range.start && minutes >= range.start) return true;
    if (range.end === 24 * 60 && minutes >= range.start) return true;
  }
  const yesterday = previousDay(day);
  for (const range of schedule.get(yesterday) ?? []) {
    if (range.end < range.start && minutes < range.end) return true;
  }
  return false;
}

export function openState(spec: string, date = new Date()): { open: boolean } | null {
  if (!spec.trim()) return null;
  const schedule = parseSchedule(spec);
  const clock = houstonClock(date);
  if (!schedule || !clock) return null;
  return { open: isOpenAt(clock.day, clock.minutes, schedule) };
}

export function formatHours(spec: string) {
  return spec
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}
