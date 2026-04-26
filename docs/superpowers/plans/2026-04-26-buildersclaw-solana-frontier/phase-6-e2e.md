# Phase 6 — End-to-end smoke + polish (Days 14-15, ~12h)

Goal: a single script that runs the full demo on devnet, plus bug fixes and UI polish for the demo video.

## Task 6.1: E2E smoke script

**Files:** `scripts/{seed-demo.ts,e2e-smoke.sh}`

- [ ] **Step 1: seed-demo.ts** — programmatically run the full demo on devnet

```typescript
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { EscrowClient, VerdictClient, makeUmi, registerAgent, launchAgentToken } from "@buildersclaw/solana-integration";
import * as fs from "node:fs";

const RPC = process.env.SOLANA_RPC_URL!;
const conn = new Connection(RPC, "confirmed");
const load = (p: string) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));

async function main() {
  const backend = load(process.env.SOLANA_BACKEND_KEYPAIR!);
  const judgeA = load(process.env.GEMINI_JUDGE_KEYPAIR!);
  const judgeB = load(process.env.OPENROUTER_JUDGE_KEYPAIR!);
  const judgeC = load(process.env.SPONSOR_DEFAULT_KEYPAIR!);

  console.log("Step 1: Register two demo agents");
  const umi = makeUmi({ rpcUrl: RPC, payerKeypairPath: process.env.SOLANA_BACKEND_KEYPAIR! });
  const plexpert = await registerAgent(umi, {
    name: "Plexpert", description: "Demo agent A", image: "https://placehold.co/256",
    services: [{ name: "web", endpoint: "https://example.com/plexpert" }],
  });
  const anchorette = await registerAgent(umi, {
    name: "Anchorette", description: "Demo agent B", image: "https://placehold.co/256",
    services: [{ name: "web", endpoint: "https://example.com/anchorette" }],
  });
  console.log("Agents:", plexpert.assetPubkey, anchorette.assetPubkey);

  console.log("Step 2: Sponsor creates hackathon + deposits prize");
  const mint = new PublicKey(process.env.USDC_MINT_DEVNET!);
  const sponsorAta = await getOrCreateAssociatedTokenAccount(conn, backend, mint, backend.publicKey);

  const id = BigInt(Math.floor(Date.now() / 1000));
  const escrow = new EscrowClient(conn, backend);
  const verdict = new VerdictClient(conn, backend);
  const [hackPda] = verdict.hackathonPda(id);
  const [verdictAuthority] = verdict.verdictAuthorityPda(hackPda);
  const [vaultPda] = escrow.vaultPda(id);

  const depositTx = await escrow.deposit({
    hackathonId: id, amount: 100_000_000n, mint,
    depositorAta: sponsorAta.address, verdictAuthority,
  });
  console.log("Deposit:", depositTx);

  const initTx = await verdict.initHackathon({
    id, judges: [judgeA.publicKey, judgeB.publicKey, judgeC.publicKey],
    threshold: 2, deadline: Math.floor(Date.now() / 1000) + 3600, prizeVault: vaultPda,
  });
  console.log("Init:", initTx);

  console.log("Step 3: Two judges vote for Plexpert");
  const winnerAgent = new PublicKey(plexpert.assetPubkey);
  for (const j of [judgeA, judgeB]) {
    const v = new VerdictClient(conn, j);
    const sig = await v.submitBallot({
      hackathonId: id, judge: j, winnerAgent,
      scoreRoot: Array(32).fill(0), reasoningUri: "ar://demo",
    });
    console.log("Ballot:", j.publicKey.toString().slice(0, 8), sig);
  }

  console.log("Step 4: Settle (releases USDC)");
  const winnerKp = Keypair.generate();
  const winnerAta = await getOrCreateAssociatedTokenAccount(conn, backend, mint, winnerKp.publicKey);
  const ballotPdas = [judgeA, judgeB].map(j => verdict.ballotPda(hackPda, j.publicKey)[0]);
  const [vaultAta] = escrow.vaultAtaPda(vaultPda);
  const settleTx = await verdict.settleVerdict({
    hackathonId: id, prizeVault: vaultPda, vaultAta, winnerAta: winnerAta.address,
    escrowProgramId: new PublicKey(process.env.ESCROW_PROGRAM_ID!), ballotPdas,
  });
  console.log("Settle:", settleTx);

  console.log("Step 5: Genesis launch for winner");
  const launch = await launchAgentToken(umi, {
    agentAsset: plexpert.assetPubkey, name: "Plexpert", symbol: "PLEX", image: "https://placehold.co/256",
  });
  console.log("Launch:", launch);

  console.log("\nDONE. Solscan links:");
  console.log(`  Deposit: https://solscan.io/tx/${depositTx}?cluster=devnet`);
  console.log(`  Init:    https://solscan.io/tx/${initTx}?cluster=devnet`);
  console.log(`  Settle:  https://solscan.io/tx/${settleTx}?cluster=devnet`);
  console.log(`  Mint:    https://solscan.io/token/${launch.mint}?cluster=devnet`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: e2e-smoke.sh wrapper**

```bash
cat > scripts/e2e-smoke.sh <<'SHELL'
#!/usr/bin/env bash
set -euo pipefail
echo "Loading .env.local…"
set -a; source .env.local; set +a
npx tsx scripts/seed-demo.ts
SHELL
chmod +x scripts/e2e-smoke.sh
```

- [ ] **Step 3: Run + commit**

```bash
./scripts/e2e-smoke.sh
git add scripts
git commit -m "test(e2e): devnet smoke runs full demo programmatically"
```

Expected: completes without errors. All 4 solscan URLs work. Note any failures and fix root causes.

## Task 6.2: Polish ceremony page reveal

**Files:** `apps/web/src/components/CeremonyView.tsx`

- [ ] **Step 1: Add staged reveal animation** — wrap the result block (settle → launch → winner) with sequenced fade-in. Use simple Tailwind `animate-in fade-in duration-700` (already in tw-animate-css from imported deps).

> Already covered in the v1 CeremonyView code (the result block has the 3 cards: settle → launch → winner). Make sure each card animates in sequence: stagger by 200ms.

```tsx
{result && (
  <div className="grid gap-3">
    <div className="p-4 bg-emerald-950/40 border border-emerald-700 rounded animate-in fade-in slide-in-from-bottom-4 duration-500">
      ...
    </div>
    <div className="p-4 bg-emerald-950/40 border border-emerald-700 rounded animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      ...
    </div>
    <div className="p-4 bg-emerald-500/10 border border-emerald-500 rounded text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
      ...
    </div>
  </div>
)}
```

```bash
git add apps/web
git commit -m "feat(web): staged reveal animation for ceremony result"
```

## Task 6.3: Bug fix pass

- [ ] **Step 1: Run e2e until clean**

```bash
./scripts/e2e-smoke.sh
```

Common issues you'll likely hit:
- **Insufficient SOL on backend keypair** → `solana airdrop 5`
- **USDC balance missing** → use Circle's devnet faucet at https://faucet.circle.com
- **Missing env var** → check `.env.local` against `.env.example`
- **Genesis SDK shape mismatch** → adjust `genesisLaunch.ts` based on actual return shape (the `(result as any).tokenMint?.toString() ?? (result as any).mint?.toString()` already handles the two known variants)
- **Anchor type mismatch in IDL** → re-copy IDL after rebuild: `cp target/idl/*.json packages/solana-integration/src/idl/`
- **Ballot fetched as wrong account type** in settle CPI tally — make sure each ballot PDA is passed as `remainingAccounts`, not as named accounts

- [ ] **Step 2: Manual UI walkthrough** — open browser, exercise sponsor + agent flow end-to-end:
  1. Connect wallet at `/`
  2. Create hackathon at `/hackathons/create`
  3. Register two agents at `/agents/register`
  4. Submit each agent (POST to `/api/hackathons/[id]/submit`)
  5. Trigger judge votes (run the judge services or use sponsor manual judge)
  6. Open ceremony page → settle → see Genesis launch reveal

If smooth: that's a candidate take for the demo video.

```bash
git add . && git diff --cached --quiet || git commit -m "fix: e2e bugs from devnet smoke pass"
```
