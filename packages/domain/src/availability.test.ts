import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSlots,
  isSlotAvailable,
  wallTimeToUtc,
  type AvailabilityWindow,
} from "./availability.ts";

const LAGOS = "Africa/Lagos"; // UTC+1, no DST

// Fixed "now": Monday 2026-08-03 08:00 Lagos (07:00 UTC)
const NOW = new Date("2026-08-03T07:00:00Z");

const baseOpts = {
  timeZone: LAGOS,
  durationMinutes: 60,
  leadTimeMinutes: 60,
  horizonDays: 2,
  now: NOW,
};

const mondayWindow: AvailabilityWindow = {
  day_of_week: 1,
  specific_date: null,
  start_time: "09:00",
  end_time: "12:00",
  is_blocked: false,
};

test("wallTimeToUtc converts Lagos wall time to UTC (-1h)", () => {
  const utc = wallTimeToUtc("2026-08-03", "09:00", LAGOS);
  assert.equal(utc.toISOString(), "2026-08-03T08:00:00.000Z");
});

test("weekly window produces hourly slots within the window", () => {
  const slots = computeSlots([mondayWindow], [], baseOpts);
  const monday = slots.filter((s) => s.toISOString().startsWith("2026-08-03"));
  // 09:00, 10:00, 11:00 Lagos = 08:00, 09:00, 10:00 UTC
  assert.deepEqual(
    monday.map((s) => s.toISOString()),
    [
      "2026-08-03T08:00:00.000Z",
      "2026-08-03T09:00:00.000Z",
      "2026-08-03T10:00:00.000Z",
    ],
  );
});

test("lead time filters out slots that start too soon", () => {
  // lead time 3h from 08:00 Lagos → nothing before 11:00 Lagos (10:00 UTC)
  const slots = computeSlots([mondayWindow], [], {
    ...baseOpts,
    leadTimeMinutes: 180,
  }).filter((s) => s.toISOString().startsWith("2026-08-03"));
  assert.deepEqual(
    slots.map((s) => s.toISOString()),
    ["2026-08-03T10:00:00.000Z"],
  );
});

test("existing appointment removes the overlapping slot", () => {
  const busy = [
    {
      start: new Date("2026-08-03T09:00:00Z"), // 10:00 Lagos
      end: new Date("2026-08-03T10:00:00Z"),
    },
  ];
  const monday = computeSlots([mondayWindow], busy, baseOpts).filter((s) =>
    s.toISOString().startsWith("2026-08-03"),
  );
  assert.deepEqual(
    monday.map((s) => s.toISOString()),
    ["2026-08-03T08:00:00.000Z", "2026-08-03T10:00:00.000Z"],
  );
});

test("blocked specific date closes the whole day", () => {
  const blockedDay: AvailabilityWindow = {
    day_of_week: null,
    specific_date: "2026-08-03",
    start_time: "00:00",
    end_time: "23:59",
    is_blocked: true,
  };
  const monday = computeSlots([mondayWindow, blockedDay], [], baseOpts).filter(
    (s) => s.toISOString().startsWith("2026-08-03"),
  );
  assert.equal(monday.length, 0);
});

test("open specific-date rows replace the weekly pattern", () => {
  const specialHours: AvailabilityWindow = {
    day_of_week: null,
    specific_date: "2026-08-03",
    start_time: "14:00",
    end_time: "16:00",
    is_blocked: false,
  };
  const monday = computeSlots([mondayWindow, specialHours], [], baseOpts).filter(
    (s) => s.toISOString().startsWith("2026-08-03"),
  );
  // 14:00, 15:00 Lagos = 13:00, 14:00 UTC — weekly 09-12 gone
  assert.deepEqual(
    monday.map((s) => s.toISOString()),
    ["2026-08-03T13:00:00.000Z", "2026-08-03T14:00:00.000Z"],
  );
});

test("isSlotAvailable accepts an exact slot and rejects an off-grid time", () => {
  assert.equal(
    isSlotAvailable(new Date("2026-08-03T09:00:00Z"), [mondayWindow], [], baseOpts),
    true,
  );
  assert.equal(
    isSlotAvailable(new Date("2026-08-03T09:30:00Z"), [mondayWindow], [], baseOpts),
    false,
  );
});
