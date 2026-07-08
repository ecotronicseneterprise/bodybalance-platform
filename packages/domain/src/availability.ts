/**
 * Availability computation (BLUEPRINT 3.6, docs/DB-DECISIONS.md §Open).
 *
 * Deterministic, pure core: weekly recurring windows + date-specific
 * overrides/blocks − existing appointments → bookable slot starts.
 * Times in availability rows are CLINIC-LOCAL (F11); output is UTC ISO.
 *
 * Date-override semantics (fixed here, documented once):
 *  - If ANY specific_date rows exist for a date, they REPLACE the weekly
 *    pattern for that date (a blocked date row with no open rows = closed).
 *  - is_blocked windows subtract from open windows on the same date.
 */

export interface AvailabilityWindow {
  day_of_week: number | null; // 0 = Sunday
  specific_date: string | null; // YYYY-MM-DD
  start_time: string; // HH:mm[:ss]
  end_time: string;
  is_blocked: boolean;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface SlotComputationOptions {
  timeZone: string; // IANA, from clinic_settings
  durationMinutes: number; // from services
  leadTimeMinutes: number; // from clinic_settings
  horizonDays: number; // from clinic_settings
  now?: Date; // injectable for tests
}

/** Convert a clinic-local wall time on a date to UTC. (Africa/Lagos has no
 * DST; for DST zones this is correct except the ambiguous switch hour.) */
export function wallTimeToUtc(dateISO: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y!, m! - 1, d!, hh!, mm ?? 0);
  const offsetMs = tzOffsetMs(timeZone, new Date(guess));
  return new Date(guess - offsetMs);
}

function tzOffsetMs(timeZone: string, at: Date): number {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT+01:00"
  const m = part?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0; // "GMT" exactly = UTC
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3])) * 60_000;
}

/** Local calendar date (YYYY-MM-DD) for an instant in a time zone. */
export function localDateISO(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

interface Interval {
  start: number;
  end: number;
} // epoch ms

function subtract(open: Interval[], blocked: Interval[]): Interval[] {
  let result = open;
  for (const b of blocked) {
    const next: Interval[] = [];
    for (const o of result) {
      if (b.end <= o.start || b.start >= o.end) {
        next.push(o);
        continue;
      }
      if (b.start > o.start) next.push({ start: o.start, end: b.start });
      if (b.end < o.end) next.push({ start: b.end, end: o.end });
    }
    result = next;
  }
  return result;
}

export function computeSlots(
  windows: AvailabilityWindow[],
  busy: BusyInterval[],
  opts: SlotComputationOptions,
): Date[] {
  const now = opts.now ?? new Date();
  const earliest = now.getTime() + opts.leadTimeMinutes * 60_000;
  const latest = now.getTime() + opts.horizonDays * 86_400_000;
  const durationMs = opts.durationMinutes * 60_000;
  const slots: Date[] = [];

  for (let dayOffset = 0; dayOffset <= opts.horizonDays; dayOffset++) {
    const dayInstant = new Date(now.getTime() + dayOffset * 86_400_000);
    const dateISO = localDateISO(dayInstant, opts.timeZone);
    const dow = new Date(`${dateISO}T12:00:00Z`).getUTCDay();

    const dateRows = windows.filter((w) => w.specific_date === dateISO);
    const weeklyRows = windows.filter((w) => w.day_of_week === dow);
    // date rows REPLACE the weekly pattern; blocked rows always subtract
    const openRows = (dateRows.some((r) => !r.is_blocked) ? dateRows : dateRows.length ? [] : weeklyRows).filter(
      (r) => !r.is_blocked,
    );
    const blockedRows = [...dateRows, ...weeklyRows].filter((r) => r.is_blocked);

    const toInterval = (r: AvailabilityWindow): Interval => ({
      start: wallTimeToUtc(dateISO, r.start_time, opts.timeZone).getTime(),
      end: wallTimeToUtc(dateISO, r.end_time, opts.timeZone).getTime(),
    });

    const openIntervals = subtract(openRows.map(toInterval), [
      ...blockedRows.map(toInterval),
      ...busy.map((b) => ({ start: b.start.getTime(), end: b.end.getTime() })),
    ]);

    for (const interval of openIntervals) {
      for (let t = interval.start; t + durationMs <= interval.end; t += durationMs) {
        if (t >= earliest && t <= latest) slots.push(new Date(t));
      }
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/** True when [start, start+duration) is one of the computed bookable slots. */
export function isSlotAvailable(
  requestedStart: Date,
  windows: AvailabilityWindow[],
  busy: BusyInterval[],
  opts: SlotComputationOptions,
): boolean {
  return computeSlots(windows, busy, opts).some(
    (s) => s.getTime() === requestedStart.getTime(),
  );
}
