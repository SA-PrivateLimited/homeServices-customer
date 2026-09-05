# AGENTS.md — Agent Persona Index (HomeServices)

Wired from `ai-agent-cursor-claude` for the **Customer mobile app**.

## Persona routing

| Stage | Persona file | Shorthand |
|-------|-------------|-----------|
| 1 — Spec | `.claude/agents/product-manager.md` | PM |
| 2 — Plan | `.claude/agents/planner.md` | Planner |
| 3 — Test | `.claude/agents/tester.md` | Test Engineer |
| 4 — Implement | `.claude/agents/frontend.md` | Frontend Engineer (RN) |
| 5 — Verify | `.claude/agents/verifier.md` | Verifier |
| 6 — Review | `.claude/agents/reviewer.md` | Reviewer |
| 7 — Report | `.claude/agents/reporter.md` | Reporter |

## Entry point
Always start with `agent-context/[ticket-id]/AGENT_KICKOFF.md`.

For **customer-web → RN parity** (ongoing product mission), use:

`docs/CUSTOMER_WEB_RN_PARITY_PROMPT.md`

## Key files
- `CODEBASE_CONTEXT.md` — this app's patterns (read before Stage 2)
- `baseline.md` — design / API conventions
- `docs/CUSTOMER_WEB_RN_PARITY_PROMPT.md` — standing web parity prompt
- `agent-context/[ticket-id]/REUSABLE_INVENTORY.md` — reuse first
