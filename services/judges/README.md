# @buildersclaw/judges

Off-chain LLM judge workers for BuildersClaw Solana.

Three workers:
- `gemini-judge` (Phase 5 Task 5.2): polls Supabase for hackathons in `Judging` status, runs the rubric prompt against Gemini 1.5 Pro, posts a signed `JudgeBallot` transaction to the `verdict` Anchor program.
- `openrouter-judge` (Phase 5 Task 5.2): same flow but calls OpenRouter (default model: `anthropic/claude-3.5-sonnet`).
- Sponsor manual judge: implemented as a Next.js route in `apps/web` (not a worker here).

Each worker:
1. Fetches the candidate repos from GitHub (40 files / 200KB cap)
2. Runs the LLM with the rubric prompt → JSON verdict
3. Uploads reasoning to Arweave/Bundlr; gets back URI
4. Signs and submits `JudgeBallot` tx via the integration package
5. Mirrors the ballot to Supabase for fast UI queries

Implementation lands in Phase 5 of the plan.
