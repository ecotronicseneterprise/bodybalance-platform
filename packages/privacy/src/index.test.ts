import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeInput,
  buildClinicalContext,
  validateOutput,
} from "./index.ts";

test("detects and masks emails", () => {
  const { sanitized, found } = sanitizeInput("reach me at john.smith@gmail.com please");
  assert.equal(sanitized, "reach me at [redacted-email] please");
  assert.equal(found[0]?.type, "email");
});

test("detects and masks international and Nigerian phone formats", () => {
  for (const input of [
    "call +2348136293596 now",
    "call 08031234567 now",
    "call 0803 123 4567 now",
  ]) {
    const { sanitized } = sanitizeInput(input);
    assert.equal(sanitized, "call [redacted-phone] now", `failed for: ${input}`);
  }
});

test("masks the exact scenario from BLUEPRINT 5.7", () => {
  const { sanitized } = sanitizeInput(
    "My name is John Smith. My phone is 08031234567. I have had lower back pain for two weeks.",
    ["John Smith"],
  );
  assert.ok(!sanitized.includes("John Smith"));
  assert.ok(!sanitized.includes("08031234567"));
  assert.ok(sanitized.includes("lower back pain for two weeks"));
});

test("masks date-like strings (DOB risk)", () => {
  const { sanitized } = sanitizeInput("I was born 14/03/1985.");
  assert.equal(sanitized, "I was born [redacted-date].");
});

test("masks long id-like digit runs", () => {
  const { found } = sanitizeInput("my NIN is 12345678901234567");
  assert.ok(found.length > 0);
  assert.ok(["id_number", "phone"].includes(found[0]!.type));
});

test("known identifiers are masked case-insensitively wherever they appear", () => {
  const { sanitized } = sanitizeInput("tell CHERRY that mary adebayo called", [
    "Mary Adebayo",
  ]);
  assert.ok(!sanitized.toLowerCase().includes("mary adebayo"));
});

test("clean clinical text passes through untouched", () => {
  const text =
    "Sharp pain in my lower back when bending, about 7 out of 10, started two weeks ago.";
  const { sanitized, found } = sanitizeInput(text);
  assert.equal(sanitized, text);
  assert.equal(found.length, 0);
});

test("buildClinicalContext keeps only whitelisted, validated fields", () => {
  const ctx = buildClinicalContext({
    age_range: "26-35",
    sex: "male",
    pain_location: "lower back",
    pain_severity: 7,
    pain_duration: "2 weeks",
    symptoms: ["stiffness in the morning"],
    // everything below must be dropped
    name: "John Smith",
    email: "john@example.com",
    phone: "+2348136293596",
    date_of_birth: "1990-01-01",
    appointment_id: "abc-123",
    pain_severity_invalid: 99,
  } as Record<string, unknown>);

  assert.deepEqual(ctx, {
    age_range: "26-35",
    sex: "male",
    pain_location: "lower back",
    pain_duration: "2 weeks",
    pain_severity: 7,
    symptoms: ["stiffness in the morning"],
  });
  assert.ok(!JSON.stringify(ctx).includes("John"));
  assert.ok(!JSON.stringify(ctx).includes("2348136293596"));
});

test("buildClinicalContext rejects invalid enum/range values", () => {
  const ctx = buildClinicalContext({
    age_range: "12-17",
    sex: "unknown",
    pain_severity: 11,
  });
  assert.deepEqual(ctx, {});
});

test("buildClinicalContext sanitizes PII inside allowed string fields", () => {
  const ctx = buildClinicalContext({
    occupation: "driver, call me on 08031234567",
  });
  assert.equal(ctx.occupation, "driver, call me on [redacted-phone]");
});

test("validateOutput flags identifier echoes in model output", () => {
  const bad = validateOutput("Sure John, I'll call you on 08031234567.", ["John"]);
  assert.equal(bad.safe, false);
  assert.ok(bad.leaks.length >= 2);

  const good = validateOutput(
    "Many people with similar symptoms benefit from gentle movement. Shall we book an assessment?",
  );
  assert.equal(good.safe, true);
});
