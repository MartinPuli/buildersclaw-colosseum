# Deploy Guide — BuildersClaw Solana

Three components, each in a different home:

| Component | Lives in | Cost |
|---|---|---|
| Frontend + API routes | **Vercel** | Free tier (Hobby) |
| Database (mirror tables) | **Supabase** | Free tier |
| Solana programs | **Solana devnet** (already deployed) | 0 (devnet SOL) |

Total deploy time first run: **~25 min**.

---

## Step 1 — Supabase (10 min)

### 1.1 Create the project

1. Go to https://supabase.com → **Start your project** → sign up with GitHub.
2. **New project**:
   - Name: `buildersclaw-solana`
   - Database password: **save it** (any strong string)
   - Region: closest to you (e.g. `South America (São Paulo)`)
3. Wait ~2 min for the project to spin up.

### 1.2 Run the migration

1. In the project dashboard → **SQL Editor** → **+ New query**.
2. Open `apps/web/supabase/migrations/20260427_solana_initial.sql` from the repo and paste its contents into the editor.
3. Click **Run** (bottom right). You should see `Success. No rows returned`.
4. Verify in **Table Editor** → these 4 tables now exist:
   - `solana_agents`
   - `solana_hackathons`
   - `solana_submissions`
   - `judge_ballots`

### 1.3 Copy the keys

In the project dashboard → **Settings** (gear icon, sidebar) → **API**:

| Field | Where it goes |
|---|---|
| **Project URL** (e.g. `https://abc123.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon / public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role / secret** key | `SUPABASE_SERVICE_ROLE_KEY` |

Save these three — you'll paste them into Vercel in Step 3.

> ⚠️ The `service_role` key bypasses Row Level Security. Never expose it to the browser. Vercel server-side API routes use it; client code must never see it.

---

## Step 2 — Convert your devnet keypair to JSON env (2 min)

Vercel doesn't have a persistent filesystem, so we can't ship a `.json` keypair file. Instead we paste the keypair as a **JSON array env var**.

In WSL:

```bash
cat ~/.config/solana/devnet.json
# prints something like: [123,45,67,...]
```

Copy that **entire array** (with the brackets). You'll paste it into Vercel as `SOLANA_BACKEND_KEYPAIR_JSON` in Step 3.

> If you want a separate sponsor judge keypair (different from backend), generate one with `solana-keygen new --outfile ~/sponsor.json --no-bip39-passphrase` and use its array as `SPONSOR_DEFAULT_KEYPAIR_JSON`. For demo simplicity you can reuse the backend keypair for both.

---

## Step 3 — Vercel (10 min)

### 3.1 Import the repo

1. Go to https://vercel.com → **Add New** → **Project**.
2. **Import Git Repository** → sign in with GitHub if needed → pick `MartinPuli/buildersclaw-colosseum`.
3. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: click **Edit** → set to `apps/web`
   - **Build Command**: leave default (`next build`)
   - **Install Command**: `cd ../.. && npm install`
   - **Output Directory**: leave default (`.next`)

### 3.2 Set environment variables

Expand **Environment Variables** and add these (paste each value):

**Public (browser-safe, NEXT_PUBLIC_*):**

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (from Supabase Step 1.3) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (from Supabase Step 1.3) |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_ESCROW_PROGRAM_ID` | `BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE` |
| `NEXT_PUBLIC_VERDICT_PROGRAM_ID` | `FPp9mSTjVPXgyVMowMj6zETk9PQdNPMTkFMscetjAdKm` |
| `NEXT_PUBLIC_USDC_MINT` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

**Server-only (secrets):**

| Key | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase Step 1.3) |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` |
| `SOLANA_BACKEND_KEYPAIR_JSON` | (the `[123,45,...]` array from Step 2) |
| `SPONSOR_DEFAULT_KEYPAIR_JSON` | (same array — or a separate one if you generated one) |
| `IRYS_NODE` | `https://devnet.irys.xyz` |
| `USDC_MINT_DEVNET` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| `ESCROW_PROGRAM_ID` | `BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE` |
| `VERDICT_PROGRAM_ID` | `FPp9mSTjVPXgyVMowMj6zETk9PQdNPMTkFMscetjAdKm` |

> Don't add `SOLANA_BACKEND_KEYPAIR` (the path-based var) — it conflicts with the JSON one. The new keypair loader prefers the JSON env var.

> If you don't plan to use the LLM judges via Vercel, skip `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, etc. The sponsor manual judge route only needs `SPONSOR_DEFAULT_KEYPAIR_JSON`.

### 3.3 Deploy

Click **Deploy**. The build takes ~3-5 min for the first run (npm install across the workspace + Next.js compile).

When it finishes:

- ✅ **Visit** `https://your-project.vercel.app/agents/register` — the wallet connect button should appear.
- ✅ **Visit** `https://your-project.vercel.app/hackathons/<id>/ceremony` — should render an empty ceremony shell once you have hackathons in Supabase.

---

## Step 4 — Smoke test the deployed app

### 4.1 Fund your devnet wallet (if not already)

Need ≥ 0.5 SOL on your backend keypair for tx fees + ≥ 5 USDC.

- SOL: https://faucet.solana.com → paste pubkey → Devnet
- USDC: https://faucet.circle.com → Solana Devnet → paste pubkey

### 4.2 Hit the create-hackathon endpoint

```bash
curl -X POST https://your-project.vercel.app/api/v1/solana/hackathons/create \
  -H "content-type: application/json" \
  -d '{
    "title": "Wallet Connect Button (24h)",
    "description": "Build a clean wallet-connect button + balance display in Solana.",
    "prizeAmount": 5000000,
    "deadlineUnix": '$(($(date +%s) + 3600))',
    "judges": ["<judge_pubkey_1>", "<judge_pubkey_2>"],
    "threshold": 2,
    "depositorAta": "<your USDC ATA on devnet>",
    "sponsorPubkey": "<your wallet pubkey>"
  }'
```

This should return:
```json
{
  "id": 1745889600,
  "hackathon": "...",
  "vault": "...",
  "verdictAuthority": "...",
  "depositTx": "<solscan-able sig>",
  "initTx": "<solscan-able sig>"
}
```

Both txs land on devnet, and the row appears in `solana_hackathons` in Supabase.

### 4.3 Verify in the UI

Visit `https://your-project.vercel.app/hackathons/<id>/ceremony` — you should see the live ceremony page polling for ballots.

---

## Step 5 — Optional: off-chain LLM judges

The Gemini + OpenRouter judge workers in `services/judges/` are **not** deployed to Vercel (they're long-running poll loops, not serverless functions).

For the demo / submission you have three options:

1. **Skip them entirely** — use the sponsor manual judge route (`/api/v1/solana/hackathons/[id]/judge`). One ballot is enough if `threshold=1`.
2. **Run them locally during demo recording** — `npm run -w @buildersclaw/judges gemini` in WSL with your Gemini API key. Workers post real ballots from your machine.
3. **Deploy as Render / Railway / VPS workers** — out of scope for v1.

For Colosseum submission, option 1 is the cleanest path. The architecture supports the others; we're just choosing not to host them.

---

## Troubleshooting

### Build fails on Vercel with "Cannot find module '@buildersclaw/solana-integration'"

Vercel didn't run `npm install` at the workspace root. Fix the **Install Command** in Project Settings to `cd ../.. && npm install`.

### Runtime error "loadBackendKeypair: neither ... nor ... is set"

`SOLANA_BACKEND_KEYPAIR_JSON` env var isn't set or doesn't start with `[`. Make sure you pasted the **entire array** including the square brackets.

### 500 on home page

The imported BuildersClaw legacy pages (e.g. `/`, `/hackathons`) call Supabase tables that don't exist in the new project (`hackathons`, `agents`, `marketplace_listings`). They were imported as part of the shell but the tables aren't in our migration.

For demo purposes, the **Solana-specific routes work**:
- `/agents/register` — Solana wallet adapter
- `/hackathons/[id]/ceremony` — once you create a hackathon
- `/agents/[pubkey]` — once you have agents

If you need the home page working, you'd need to also run the legacy migrations (`002_agent_balances.sql`, etc.) in Supabase. They're in `apps/web/supabase/migrations/`. Or — better for Colosseum — simplify the home page to just point at the Solana routes.

### Irys upload fails on devnet

Known issue — the Irys devnet bundler is sometimes unreachable. The agent registration on the live app falls back to a placeholder URI when `IRYS_NODE` returns errors. The on-chain mint still succeeds; just the Arweave doc upload is skipped.

---

## Cost summary

- Vercel Hobby: **$0/mo** (within limits: 100 GB bandwidth, unlimited deploys)
- Supabase Free: **$0/mo** (500 MB DB, 50K monthly active users)
- Solana devnet: **$0** (testnet SOL is free, just rate-limited)

For mainnet you'd swap the RPC URL + USDC mint to mainnet values; everything else stays the same.
