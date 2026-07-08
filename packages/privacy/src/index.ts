/**
 * @bodybalance/privacy — the PII firewall (BLUEPRINT 5.7).
 *
 * Four functions. Nothing more.
 *   detectPII            — find identifiers in free text
 *   sanitizeInput        — mask them before ANY LLM call
 *   buildClinicalContext — whitelist-only structured context for the model
 *   validateOutput       — scan model output for identifier echoes
 *
 * Platform-level (BLUEPRINT 5.5): no clinic configuration can weaken this.
 * Honest limitation, documented in 5.7: pattern detection is deterministic for
 * emails/phones/dates/IDs; free-text NAMES cannot be perfectly detected — the
 * `knownIdentifiers` parameter masks anything the patient already typed into
 * the booking form (name, email, phone) wherever it reappears in later text.
 */

export type PIIType =
  | "email"
  | "phone"
  | "date_of_birth"
  | "id_number"
  | "known_identifier";

export interface PIIMatch {
  type: PIIType;
  value: string;
  start: number;
  end: number;
}

const PATTERNS: ReadonlyArray<{ type: PIIType; re: RegExp }> = [
  { type: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // Phones: international (+2348136293596, +44 20 7946 0958) and Nigerian
  // local (08031234567, 0803 123 4567), tolerating spaces/dashes/parens.
  { type: "phone", re: /(?:\+\d{1,3}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?\d(?:[\s-]?\d){8,13}/g },
  // Date-like patterns (dd/mm/yyyy, yyyy-mm-dd, dd.mm.yy) — treated as DOB
  // risk in a clinical chat context.
  { type: "date_of_birth", re: /\b\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}\b/g },
  // Long unbroken digit runs (NIN, insurance, card numbers) not already
  // matched as phones.
  { type: "id_number", re: /\b\d{10,19}\b/g },
];

const MASK: Record<PIIType, string> = {
  email: "[redacted-email]",
  phone: "[redacted-phone]",
  date_of_birth: "[redacted-date]",
  id_number: "[redacted-id]",
  known_identifier: "[redacted]",
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find PII in free text. `knownIdentifiers` are session-known values
 * (name/email/phone from the booking form) masked wherever they appear. */
export function detectPII(
  text: string,
  knownIdentifiers: readonly string[] = [],
): PIIMatch[] {
  const matches: PIIMatch[] = [];

  for (const id of knownIdentifiers) {
    const trimmed = id.trim();
    if (trimmed.length < 2) continue;
    const re = new RegExp(escapeRegExp(trimmed), "gi");
    for (const m of text.matchAll(re)) {
      matches.push({
        type: "known_identifier",
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  for (const { type, re } of PATTERNS) {
    for (const m of text.matchAll(re)) {
      const start = m.index;
      const end = start + m[0].length;
      // skip regions already covered by an earlier (higher-priority) match
      if (matches.some((x) => start < x.end && end > x.start)) continue;
      matches.push({ type, value: m[0], start, end });
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

/** Mask all detected PII. The result — never the raw text — is what any LLM
 * request may contain. */
export function sanitizeInput(
  text: string,
  knownIdentifiers: readonly string[] = [],
): { sanitized: string; found: PIIMatch[] } {
  const found = detectPII(text, knownIdentifiers);
  let out = "";
  let cursor = 0;
  for (const m of found) {
    out += text.slice(cursor, m.start) + MASK[m.type];
    cursor = m.end;
  }
  out += text.slice(cursor);
  return { sanitized: out, found };
}

export const AGE_RANGES = ["18-25", "26-35", "36-45", "46-60", "60+"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

/** What the model MAY receive (BLUEPRINT 5.7 allowed list). Nothing else. */
export interface ClinicalContext {
  age_range?: AgeRange;
  sex?: "male" | "female";
  pregnant?: boolean;
  occupation?: string;
  pain_location?: string;
  pain_duration?: string;
  pain_severity?: number; // 1–10
  symptoms?: string[];
  activity_limitations?: string[];
  previous_injuries?: string[];
  goals?: string[];
}

/**
 * Whitelist-only construction: unknown keys are dropped, every string field is
 * itself sanitized, enums/ranges validated. This is the ONLY object shape that
 * carries patient context into a prompt.
 */
export function buildClinicalContext(
  raw: Record<string, unknown>,
  knownIdentifiers: readonly string[] = [],
): ClinicalContext {
  const clean = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim()
      ? sanitizeInput(v.trim(), knownIdentifiers).sanitized
      : undefined;

  const cleanList = (v: unknown): string[] | undefined =>
    Array.isArray(v)
      ? v.map(clean).filter((s): s is string => Boolean(s))
      : undefined;

  const ctx: ClinicalContext = {};

  if (AGE_RANGES.includes(raw.age_range as AgeRange)) {
    ctx.age_range = raw.age_range as AgeRange;
  }
  if (raw.sex === "male" || raw.sex === "female") ctx.sex = raw.sex;
  if (typeof raw.pregnant === "boolean") ctx.pregnant = raw.pregnant;

  const occupation = clean(raw.occupation);
  if (occupation) ctx.occupation = occupation;
  const painLocation = clean(raw.pain_location);
  if (painLocation) ctx.pain_location = painLocation;
  const painDuration = clean(raw.pain_duration);
  if (painDuration) ctx.pain_duration = painDuration;

  if (
    typeof raw.pain_severity === "number" &&
    Number.isInteger(raw.pain_severity) &&
    raw.pain_severity >= 1 &&
    raw.pain_severity <= 10
  ) {
    ctx.pain_severity = raw.pain_severity;
  }

  const symptoms = cleanList(raw.symptoms);
  if (symptoms?.length) ctx.symptoms = symptoms;
  const limitations = cleanList(raw.activity_limitations);
  if (limitations?.length) ctx.activity_limitations = limitations;
  const injuries = cleanList(raw.previous_injuries);
  if (injuries?.length) ctx.previous_injuries = injuries;
  const goals = cleanList(raw.goals);
  if (goals?.length) ctx.goals = goals;

  return Object.freeze(ctx);
}

/** Scan LLM OUTPUT before it reaches the patient: a response must not echo
 * identifiers (e.g. a phone number it was never supposed to know). */
export function validateOutput(
  text: string,
  knownIdentifiers: readonly string[] = [],
): { safe: boolean; leaks: PIIMatch[] } {
  const leaks = detectPII(text, knownIdentifiers).filter(
    // Clinic contact details legitimately appear in responses (booking CTA
    // uses the clinic WhatsApp number from get_clinic_settings) — callers pass
    // those as allowed via a separate mechanism later if needed. For now any
    // detected identifier is flagged; the caller decides.
    () => true,
  );
  return { safe: leaks.length === 0, leaks };
}
