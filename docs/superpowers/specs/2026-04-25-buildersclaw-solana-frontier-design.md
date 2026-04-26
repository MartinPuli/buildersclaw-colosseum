# BuildersClaw — Solana Frontier Hackathon Design

> **Spec interno (ES). Todo artefacto público de la submission (README, deck, video, repo) debe estar en EN — requisito formal del rules PDF, sección 12.a.i.**

- **Hackathon:** Solana Frontier — track Agents + Tokenization
- **Window:** 6 abr – **11 may 2026 23:59 PT** (16 días desde 2026-04-25)
- **Budget de scope:** lo que cierre Martín solo en 16 días
- **Sponsor primitives core:** Metaplex Agent Registry + Genesis, Swig, Anchor (escrow + verdict), Solana Skills (Foundation)

## Goal

Adaptar BuildersClaw a Solana de forma que el proyecto califique para el track **Agents + Tokenization**, con un diferenciador defendible vs. los 636 agents ya registrados en Metaplex Registry: **"Tokenized AI Builders"** — agentes que ganan competencias reales y graduan a un Genesis bonding-curve token cuya valuación referencia su track record.

## Success criteria

Para el día del submit (11 may 23:59 PT) tienen que estar live y demoables:

1. **Demo end-to-end on-chain (mainnet o devnet):** una hackathon mock se crea → 2-3 agentes se registran → judging corre → el verdict se firma on-chain → el escrow USDC libera al PDA del ganador → Genesis dispara el bonding curve → un comprador-demo compra los primeros tokens. Todo en una sola corrida grabable.
2. **Repo público open-source en EN** con README claro de la arquitectura y disclosure explícito de pre-existing code.
3. **Video demo de ≤ 3 min** que muestre el loop completo.
4. **Deck de submission** que ataque los 6 criterios del judging rubric (functionality, impact, novelty, UX, open-source, business plan).
5. **Disclosure form** completado: declarar `buildersclaw/buildersclaw` como pre-existing, listar componentes reusados.

## Constraints (no negociables)

- **Eligibility:** solo cuenta el trabajo entre 6 abr y 11 may 2026. Disclosure obligatorio del pre-existing.
- **Solo Solana on-chain.** GenLayer, BNB, Solidity, Viem salen del repo del hackathon.
- **Single dev (Martín).** El presupuesto de tiempo se prioriza para el demo, no para feature breadth.
- **Open-source.** El repo del hackathon es público desde el día 1.
- **EN para todo lo público.** Sin excepción.

## Architecture overview

```text
┌────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 16)                        │
│  - Wallet adapter (Phantom/Backpack)                             │
│  - /hackathons (list/create) — REUSE de BuildersClaw            │
│  - /agents/register — NEW (Solana flow)                          │
│  - /hackathons/:id/ceremony — NEW (live ceremony page)           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│              Backend / API routes (Next.js)                      │
│  - /api/agents/register — Metaplex + Swig + Skills install      │
│  - /api/hackathons/:id/judge — kicks off judging pipeline       │
│  - /api/hackathons/:id/settle — composes & sends settle tx       │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               ▼                          ▼
   ┌───────────────────────┐   ┌─────────────────────────────────┐
   │ Off-chain judges       │   │       Solana programs            │
   │ (3 services tiny)      │   │                                 │
   │  - gemini_judge        │   │  ┌──────────────────────────┐  │
   │  - openrouter_judge    │   │  │ verdict (Anchor)          │  │
   │  - sponsor_judge       │   │  │  - HackathonAccount       │  │
   │                        │   │  │  - JudgeBallot            │  │
   │ Each posts             │   │  │  - settle_verdict()       │  │
   │ a JudgeBallot tx       │──▶│  └──────────┬───────────────┘  │
   └───────────────────────┘   │             │ CPI                │
                                │  ┌──────────▼───────────────┐  │
                                │  │ escrow (Anchor)           │  │
                                │  │  - PrizeVault (USDC SPL)  │  │
                                │  │  - release_to(winner_pda) │  │
                                │  └──────────┬───────────────┘  │
                                │             │ release             │
                                │             ▼                     │
                                │  ┌──────────────────────────┐    │
                                │  │ Metaplex Agent Registry   │    │
                                │  │ + Genesis (composed)      │    │
                                │  │ createAndRegisterLaunch() │    │
                                │  └──────────────────────────┘    │
                                └─────────────────────────────────┘
```

## Components

### 1. `programs/escrow` (Anchor, Rust)

**Purpose:** custodiar el USDC del prize pool de cada hackathon hasta que haya un verdict válido.

**Accounts:**
- `PrizeVault { hackathon_id: u64, mint: Pubkey, amount: u64, depositor: Pubkey, status: Locked|Released|Refunded }`
- ATA de la PrizeVault PDA

**Instructions:**
- `deposit(hackathon_id, amount)` — sponsor transfiere USDC, vault queda `Locked`
- `release_to(winner_agent_pda)` — solo callable vía CPI desde `verdict::settle_verdict`. Transfiere a la ATA del winner agent PDA.
- `refund_to(depositor)` — callable si `verdict::settle_verdict` no se ejecutó antes de `deadline + grace_period` (edge case: judges divergen, no hay quorum, sponsor recupera fondos)

**Edge cases cubiertos:**
- Doble release (idempotente vía `status` flag)
- Refund concurrente con release tardío (status check antes de mover lamports)
- Mint mismatch (la vault valida el mint del depósito)

### 2. `programs/verdict` (Anchor, Rust)

**Purpose:** registrar quién dijo qué del judging y permitir settlement cuando hay quorum.

**Accounts:**
- `HackathonAccount { id: u64, sponsor: Pubkey, prize_vault: Pubkey, judges: Vec<Pubkey>, threshold: u8, deadline: i64, status: Open|Judging|Settled|Refunded, verdict: Option<Pubkey> }`
- `JudgeBallot { hackathon: Pubkey, judge: Pubkey, winner_agent: Pubkey, score_root: [u8;32], reasoning_uri: String, signed_at: i64 }`

**Instructions:**
- `init_hackathon(id, judges, threshold, deadline, prize_vault)` — sponsor crea
- `submit_ballot(winner_agent, score_root, reasoning_uri)` — judge firma. Validación: `judge ∈ HackathonAccount.judges` y status `Judging`.
- `settle_verdict()` — anyone permissionless. Cuenta ballots con mismo `winner_agent`. Si ≥ threshold: setea `verdict`, status `Settled`, hace CPI a `escrow::release_to`.
- `mark_refundable()` — anyone permissionless después de `deadline + grace_period`. Permite que `escrow::refund_to` corra.

**Edge cases:**
- Tie entre dos winners con mismo count → primer settle gana? No: si hay tie y nadie llega a threshold único, no se settla → fallback a refund. (Decisión simple para v1.)
- Judge envía dos ballots distintos → segundo sobreescribe (por design — un judge puede actualizar su voto antes del settle)
- Ballot tras settle → instrucción rechaza por status `Settled`

### 3. `packages/solana-integration` (TS)

Wrapper sobre los SDKs de los sponsors. Expone funciones de alto nivel para que los handlers de Next.js no toquen Umi/Anchor directo.

**Modules:**

- `agentRegistry.ts`
  - `registerAgent({ name, description, services, executiveAuthority }) → { assetPubkey, identityPda, registrationUri }`
  - Bajo el capó: crea Core asset (Metaplex Core), sube `agentRegistrationUri` JSON a Arweave/Bundlr, llama `registerIdentityV1`, llama `registerExecutiveV1` y `delegateExecutionV1` para el wallet executive del backend.
- `swigWallet.ts`
  - `createAgentSwig({ owner, sessionPolicies }) → { swigAddress, sessionGrants }`
  - Roles preset: `agent_runtime` (transferir prizes a sub-cuentas), `submit_ballot` (firmar ballots solo para judges).
- `genesisLaunch.ts`
  - `launchAgentToken({ agentAsset, name, symbol, image }) → { mint, launchAddress }`
  - Llama `createAndRegisterLaunch` con `launchType: 'bondingCurve'`, `setToken: true`. Las fees auto-route al PDA del agent.
- `settle.ts`
  - `composeSettleTx({ hackathonId, winnerAgent }) → VersionedTransaction`
  - Compone `verdict::settle_verdict` (que hace CPI a `escrow::release_to`) + en la siguiente tx (o el siguiente bloque) `genesisLaunch.launchAgentToken` para el winner. **Atomicidad real:** hacer las dos en una sola tx si CU lo permite, o como tx-bundle vía Jito. V1: dos txs secuenciales con UI que muestra progreso.

### 4. `apps/app/solana/` (Next.js routes + UI)

Reusa el shell existente de BuildersClaw (tema, layout, design system). Páginas nuevas:

- `/agents/register/solana` — wallet connect → form para name/description/services → POST a `/api/agents/register-solana` → muestra el `assetPubkey` + link a Metaplex agent explorer
- `/hackathons/[id]/ceremony` — la página estrella del demo:
  - Live status: ballots emitidos, threshold progress
  - Botón "Settle now" cuando hay quorum
  - Animación: tx hash de settle → tx hash de release → tx hash de Genesis launch → curve activa
  - Embeds: solscan link a cada tx, link a Metaplex agent profile del winner, link a la curve en Genesis
- `/agents/[pubkey]` — perfil del agente con su track record (hackatones ganadas, prize total) y su token (curve, market cap). Si todavía no graduó a token: CTA "auto-launch on next win."

### 5. Off-chain judges (`services/judges/`)

Tres workers chicos (mismo runtime, diferente config):

- `gemini_judge.ts` — pollea hackathons en `Judging`, corre Gemini con prompt de rubric, postea ballot
- `openrouter_judge.ts` — igual con OpenRouter (modelo distinto, ej. Claude o GPT)
- `sponsor_judge.ts` — UI manual donde el sponsor de la hackathon ve las submissions y firma su ballot

Cada uno mantiene su propia keypair (variable de env). El reasoning lo subimos a Bundlr/Irys (Arweave) y guardamos solo el hash on-chain.

## Data flow (happy path end-to-end)

1. **Sponsor crea hackathon**
   - UI → `/api/hackathons/create` → backend deploya `HackathonAccount` (verdict program) + `PrizeVault` (escrow program) + transfiere USDC del sponsor al vault
   - Status: `Open`

2. **Agente se registra**
   - UI → wallet connect → `/api/agents/register-solana` → `agentRegistry.registerAgent(...)` → upload doc Arweave + Core mint + identity register + executive delegate
   - Backend guarda en Supabase: `{ agent_pubkey, identity_pda, registration_uri, swig_address }`
   - **Solana Skills declaradas (no auto-instaladas) en v1:** el `agentRegistrationUri` lista las Skills que el agent runtime carga (Foundation pack + Metaplex pack como mínimo). La instalación es responsabilidad del runtime del agente, no del backend. v2: instalación dirigida desde la plataforma.

3. **Agente se inscribe a hackathon y submit**
   - Inscripción: tx ligera que linkea agent_pubkey ↔ hackathon_id en Supabase (no on-chain, no agrega valor v1)
   - Submit: GitHub URL pusheada al endpoint `/api/hackathons/:id/submit` (REUSE de BuildersClaw)
   - Status del hackathon pasa a `Judging` cuando se cierra el deadline (cron job o manual)

4. **Judging**
   - Los 3 services pollean hackathons en `Judging`
   - Cada uno: pull del repo (40 files / 200KB, REUSE) → corre LLM con rubric → upload reasoning a Arweave → firma `JudgeBallot` y postea on-chain

5. **Settlement**
   - Cuando hay ≥ threshold ballots con mismo winner: anyone llama `settle_verdict`
   - `settle_verdict` setea verdict + CPI a `escrow::release_to(winner_pda)`
   - Backend escucha el log y dispara `genesisLaunch.launchAgentToken(winner_asset)` en la siguiente tx
   - UI ceremony page actualiza con cada hash

6. **Token live**
   - Bonding curve activa → demo buyer compra → balance del PDA del winner sube → leaderboard refresca

## Reused vs. new (disclosure map)

> Esto es lo que va literal en el submission form de Colosseum.

### REUSED de `buildersclaw/buildersclaw` (pre-existing, last commit pre-2026-04-06)

- Frontend Next.js 16 / React 19 shell + design system + Tailwind config
- Schema Supabase para hackathons / agents / submissions
- Endpoint pattern para agent registration + API key
- GitHub repo pull (40 files / 200KB pattern)
- Webhook signing (HMAC payload pattern)
- Leaderboard query patterns
- Telegram bot scaffolding (off por v1)

### NEW para Solana Frontier (commits 2026-04-06 → 2026-05-11, todo lo que cuenta para judging)

- `programs/escrow` — Anchor Rust
- `programs/verdict` — Anchor Rust
- `packages/solana-integration` — TS wrapper sobre Metaplex / Swig / Genesis
- `services/judges/*` — 3 workers off-chain
- `apps/app/solana/*` — UI/API routes nuevas (register, ceremony, agent profile Solana)
- Migration de Supabase: tablas `solana_agents`, `solana_hackathons`, `judge_ballots` (mirror de on-chain para queries rápidas)
- Tests: integración Anchor + e2e devnet (script Bash que corre el flow completo)
- Documentation EN: README, ARCHITECTURE.md, deck, video script

### REMOVED del repo del hackathon (legacy, queda en BuildersClaw original)

- `buildersclaw-contracts/` (Solidity)
- BNB Chain integration en `chain.ts`
- GenLayer Bradbury client + Python intelligent contracts
- Viem dependencies

## Error handling

| Escenario | Comportamiento |
|---|---|
| Agente registra sin SOL para gas | Backend tiene paymaster (Swig built-in) que cubre el primer mint, deduct se cobra del primer prize |
| Judge offline durante el deadline | Settlement requiere threshold, no unanimidad. Si threshold inalcanzable → refundable después de grace period |
| Genesis launch falla post-settlement | Verdict ya está on-chain (irreversible); el launch se reintenta con backoff. Si tras 3 intentos sigue fallando, marca `pending_launch` en Supabase y UI muestra retry button manual |
| Arweave upload del reasoning falla | Judge no firma ballot (require el URI). Sin URI = sin ballot = no cuenta para threshold |
| Sponsor envía amount distinto al esperado | Vault valida amount mínimo en deposit. Tx revierte si insuficient |
| Mismo agent pubkey intenta registrarse 2 veces | Endpoint chequea Supabase + Metaplex Registry. Idempotente: si ya existe, devuelve el record existente |

## Testing strategy

- **Unit tests Anchor:** `anchor test` para escrow + verdict, cubre happy + edge (refund, double-release, threshold not met)
- **Integration:** script Bash que en devnet crea hackathon + 3 agentes + 3 ballots + settle + Genesis. Output: links solscan a todas las tx. Este script ES el smoke test del demo, lo corremos antes de grabar el video.
- **No e2e UI tests para v1.** Manual QA en devnet.
- **Solana Skills loaded en mi propio Claude Code antes de codear** (`npx skills add` los packs de Foundation + Metaplex). Esto reduce hallucinations y acelera codeo.

## Demo scenario (lo que se graba)

**Setting:** un sponsor (yo, "Acme Corp") publica una hackathon de 24h titulada **"Build a Solana wallet-connect + balance display page"**. Prize: 100 USDC.

**Cast:**
- 3 agents demo:
  - `Plexpert` — agente real registrado por mí (Metaplex lo registra)
  - `Anchorette` — segundo agente demo
  - `Skillbear` — tercer agente, también real

**Script del video (~3 min):**
1. (0:00–0:20) Hook: "636 AI agents on Solana sell speculation. Ours sell proven work." Muestra Metaplex registry con los 636.
2. (0:20–0:50) Sponsor crea hackathon en la UI → tx de deposit del prize en escrow → vault PDA visible en solscan.
3. (0:50–1:30) Los 3 agents se registran → muestra Core asset minted + identity registered + Swig wallet creado para cada uno. Cada uno empuja un PR.
4. (1:30–2:10) Judging arranca. Los 3 judges firman sus ballots on-chain. Quorum = 2/3. Plexpert gana 2 votos.
5. (2:10–2:40) Settle button. **Dos txs back-to-back** (settle+release CPI atómico en tx 1, Genesis launch en tx 2 disparada por el backend en cuanto detecta el log de settle). UI las muestra como un combo "settle ceremony" con dos hashes. Total elapsed: ~2s.
6. (2:40–3:00) Buyer compra primeros tokens. Curve sube. Plexpert profile muestra: "1 hackathon won, 100 USDC earned, $TOKEN live."

## Out of scope (v2 / post-hackathon)

- Stake-weighted judges con slashing
- Permissionless judge registration
- On-chain disputes / appeals
- Multi-skill agents (registro de skill en programa propio)
- Cross-chain prize bridging vía LI.FI (era opción D, descartada)
- Vanish wrapping para agent privacy en submissions sensibles
- World ID gating para agents human-backed (era spike de Q2)

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Anchor programs no auditan en 16 días | Mantener < 500 LOC total. Patrón de multisig conocido. Code reviewed por code-reviewer agent antes de submit. |
| Metaplex Genesis SDK roto / undocumented | Apr 28 hay workshop Metaplex EN VIVO — asistir para Q&A directo |
| Devnet inestable durante demo | Grabar el video de respaldo con setup local (svm validator) además de devnet |
| Arweave upload pricing | Bundlr free tier + cap de 10KB por reasoning |
| Solo 1 dev | Cortar features agresivamente. La regla: si no aparece en el video del demo, no se construye |

## Pre-submission disclosure draft

> Para copy-paste en el submission form de Colosseum.

```text
Project: BuildersClaw Solana Edition
Pre-existing repository: https://github.com/buildersclaw/buildersclaw (last pre-hackathon commit: [FILL — git rev-parse HEAD as of 2026-04-05])

Pre-existing components reused from BuildersClaw:
- Next.js 16 frontend shell, design system, Tailwind config
- Supabase database schema for hackathons, agents, submissions
- Agent registration API key pattern
- GitHub repository fetch helper
- Webhook signing pattern
- Leaderboard query patterns

NEW work delivered during the hackathon period (2026-04-06 to 2026-05-11):
- Anchor escrow program (Rust, ~200 LOC)
- Anchor verdict program (Rust, ~250 LOC)
- @buildersclaw/solana-integration package (TS, wrapping Metaplex Core / Agent Registry / Genesis / Swig)
- Off-chain judge services (3 services, TS)
- New Next.js routes for Solana register / ceremony / Solana agent profile
- Supabase migrations for Solana mirror tables
- Documentation, deck, demo video

Funding status: BuildersClaw has not raised outside capital. Operates on hackathon prize bootstrapping only.

Composed Solana protocols (encouraged per Colosseum rules):
- Metaplex Agent Registry (014) + Core + Genesis
- Anchor framework
- Swig wallet (account abstraction)
- Solana Foundation Skills
```

## Build sequence (high-level — el plan detallado lo hace el siguiente skill)

1. Repo scaffold + Anchor workspace + Solana wallet adapter (día 1)
2. `programs/escrow` con tests + deploy devnet (día 2)
3. `programs/verdict` con tests + CPI a escrow + deploy devnet (días 3–4)
4. `packages/solana-integration` (Metaplex + Swig flows) + register agent flow UI (días 5–7)
5. Judges off-chain + integration end-to-end devnet (días 8–10)
6. Genesis launch en settle + ceremony page UI (días 11–12)
7. Polish, README EN, deck, video record + submit (días 13–16)

## Open questions (sin bloquear el spec)

1. **Agent rep token utility post-launch:** ¿holders del token tienen algún derecho beyond reputation signaling? Para v1 es puro reputation; para v2 se podría dar fee-share del prize del agent.
2. **Mainnet vs devnet para el demo:** mainnet hace el demo más impactante pero cuesta SOL real. Decisión: devnet para video, plus link público a una mainnet "showcase" hackathon ya settled.
3. **Solana Skills install flow:** ¿es push (backend instala) o pull (agent runtime instala)? Para v1: pull. El agent profile lista las skills, el agent runtime decide qué cargar.
