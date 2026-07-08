/**
 * @bodybalance/ai — LLM orchestration (BLUEPRINT section 5). Sprint 4.
 *
 * Non-negotiables carried in code, not just prompt:
 *  - guardrails run BEFORE any model call, on every patient message (5.3)
 *  - the model's only access to facts is the fixed tool surface (5.4), and
 *    every tool routes through @bodybalance/domain services (4.2)
 *  - organization_id comes from session context, never from model output (2.1)
 *  - provider abstraction from day one: OpenAI default, swappable without
 *    code changes elsewhere (implementation constraint, agreed at kickoff)
 */

export const AI_PACKAGE_READY = false as const;
