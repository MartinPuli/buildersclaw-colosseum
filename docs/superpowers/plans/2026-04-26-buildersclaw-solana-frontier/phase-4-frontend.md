# Phase 4 — Solana flows on top of imported shell (Days 9-12, ~24h)

> **NOTE on this phase:** the imported `apps/web/` from Task 0.4 already has working `app/page.tsx` (landing), `app/hackathons/page.tsx` (list), and `app/hackathons/[id]/page.tsx` (detail with the recent "anchor hackathon detail layout" refactor). This phase **extends** those pages with Solana flows; it doesn't recreate them. New routes added: `/agents/register`, `/agents/[pubkey]`, `/hackathons/[id]/ceremony`, `/hackathons/create`, plus API routes for create/submit/judge/settle/ballots.

## Task 4.1: Wallet adapter shell + wrap layout

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/WalletProviderShell.tsx`
- Create: `apps/web/src/components/ConnectButton.tsx`

- [ ] **Step 1: Install adapter deps**

```bash
cd apps/web
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/web3.js @solana/spl-token
cd ../..
```

- [ ] **Step 2: WalletProviderShell**

```tsx
"use client";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, BackpackWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletProviderShell({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new BackpackWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

- [ ] **Step 3: ConnectButton**

```tsx
"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
export function ConnectButton() { return <WalletMultiButton />; }
```

- [ ] **Step 4: Wrap layout** — in `apps/web/src/app/layout.tsx`, wrap children:

```tsx
import { WalletProviderShell } from "@/components/WalletProviderShell";
// ...
return (
  <html lang="en">
    <body>
      <WalletProviderShell>{/* existing children */}</WalletProviderShell>
    </body>
  </html>
);
```

> If the imported layout already wraps in some other provider (left over from 0.5 strip), make sure WalletProviderShell is the outermost client provider.

- [ ] **Step 5: Smoke test + commit**

```bash
cd apps/web && npm run dev
# Visit http://localhost:3000, verify Phantom button visible + connect works
git add apps/web
git commit -m "feat(web): wallet adapter shell wrapping imported layout"
```

## Task 4.2: env + supabase wiring

**Files:** `apps/web/src/lib/env.ts`, optional `apps/web/src/lib/supabase.ts`

- [ ] **Step 1: env.ts**

```typescript
const required = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};
export const env = {
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  SOLANA_RPC: required("NEXT_PUBLIC_SOLANA_RPC_URL"),
  ESCROW_PROGRAM_ID: required("NEXT_PUBLIC_ESCROW_PROGRAM_ID"),
  VERDICT_PROGRAM_ID: required("NEXT_PUBLIC_VERDICT_PROGRAM_ID"),
  USDC_MINT: required("NEXT_PUBLIC_USDC_MINT"),
};
```

- [ ] **Step 2: supabase.ts** — verify imported `src/lib/supabase.ts` exists. If not, add:

```typescript
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON);
export function supabaseService() {
  if (!env.SUPABASE_SERVICE) throw new Error("Service role not available");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE);
}
```

```bash
git add apps/web/src/lib
git commit -m "feat(web): solana env wrapper + supabase service client"
```

## Task 4.3: Update landing copy + extend hackathons list

**Files:** `apps/web/src/app/page.tsx`, `apps/web/src/app/hackathons/page.tsx`

- [ ] **Step 1: Landing copy** — replace hero section in imported `page.tsx`:

```tsx
<h1 className="text-5xl font-bold tracking-tight">Tokenized AI Builders</h1>
<p className="text-xl text-zinc-400 max-w-2xl">
  Agents register on Solana, compete in real hackathons, and graduate to
  Genesis bonding-curve tokens when they win. Reputation becomes liquid.
</p>
```

Add `<ConnectButton />` somewhere prominent.

- [ ] **Step 2: Hackathons list** — switch the Supabase query in the imported list page:

```tsx
const { data: hackathons } = await supabaseAnon
  .from("solana_hackathons")
  .select("id,title,status,prize_amount,deadline")
  .order("deadline", { ascending: false });
```

Adapt the row rendering to show `prize_amount / 1e6` USDC.

- [ ] **Step 3: Smoke test + commit**

```bash
cd apps/web && npm run dev
# Visit /, /hackathons. Verify they render (empty list OK).
git add apps/web
git commit -m "feat(web): landing copy + hackathons list reading solana_hackathons"
```

## Task 4.4: Extend hackathon detail page

**Files:** `apps/web/src/app/hackathons/[id]/page.tsx`

- [ ] **Step 1: Adapt query** — switch to `solana_hackathons`, add `solana_submissions` section, add ceremony CTA:

```tsx
const { data: hack } = await supabaseAnon.from("solana_hackathons").select("*").eq("id", id).single();
const { data: subs } = await supabaseAnon
  .from("solana_submissions").select("*, solana_agents(name)").eq("hackathon_id", id);
// ...
{hack.status === "Judging" && (
  <Link href={`/hackathons/${id}/ceremony`} className="px-6 py-3 rounded-lg bg-emerald-500 text-black font-semibold inline-block">
    Open Ceremony Page
  </Link>
)}
```

```bash
git add apps/web
git commit -m "feat(web): extend hackathon detail with solana data + ceremony CTA"
```

## Task 4.5: Create hackathon flow (UI + API)

**Files:** `apps/web/src/app/hackathons/create/page.tsx`, `apps/web/src/app/api/hackathons/create/route.ts`

- [ ] **Step 1: API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { EscrowClient, VerdictClient } from "@buildersclaw/solana-integration";
import { supabaseService } from "@/lib/supabase";
import { env } from "@/lib/env";
import * as fs from "node:fs";

interface Body {
  title: string; description?: string; prizeAmount: number;
  deadlineUnix: number; judges: string[]; threshold: number;
  depositorAta: string; sponsorPubkey: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const secret = JSON.parse(fs.readFileSync(process.env.SOLANA_BACKEND_KEYPAIR!, "utf-8"));
  const backend = Keypair.fromSecretKey(Uint8Array.from(secret));
  const conn = new Connection(env.SOLANA_RPC, "confirmed");

  const verdict = new VerdictClient(conn, backend);
  const escrow = new EscrowClient(conn, backend);
  const id = BigInt(Math.floor(Date.now() / 1000));
  const [hackPda] = verdict.hackathonPda(id);
  const [verdictAuthority] = verdict.verdictAuthorityPda(hackPda);
  const [vaultPda] = escrow.vaultPda(id);

  const depositTx = await escrow.deposit({
    hackathonId: id, amount: BigInt(body.prizeAmount),
    mint: new PublicKey(env.USDC_MINT),
    depositorAta: new PublicKey(body.depositorAta),
    verdictAuthority,
  });
  const initTx = await verdict.initHackathon({
    id, judges: body.judges.map(s => new PublicKey(s)),
    threshold: body.threshold, deadline: body.deadlineUnix, prizeVault: vaultPda,
  });

  const sb = supabaseService();
  await sb.from("solana_hackathons").insert({
    id: Number(id), sponsor: body.sponsorPubkey,
    title: body.title, description: body.description,
    prize_vault: vaultPda.toString(), prize_amount: body.prizeAmount,
    deadline: new Date(body.deadlineUnix * 1000).toISOString(),
    status: "Judging", judges: body.judges, threshold: body.threshold,
  });

  return NextResponse.json({
    id: Number(id), hackathon: hackPda.toString(), vault: vaultPda.toString(),
    depositTx, initTx,
  });
}
```

- [ ] **Step 2: UI**

```tsx
"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";

export default function CreateHackathon() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    if (!publicKey) return alert("Connect wallet first");
    setSubmitting(true);
    const body = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      prizeAmount: Number(formData.get("prize")) * 1_000_000,
      deadlineUnix: Math.floor(new Date(formData.get("deadline") as string).getTime() / 1000),
      judges: (formData.get("judges") as string).split(",").map(s => s.trim()).filter(Boolean),
      threshold: Number(formData.get("threshold")),
      depositorAta: formData.get("depositorAta") as string,
      sponsorPubkey: publicKey.toString(),
    };
    const res = await fetch("/api/hackathons/create", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return alert(JSON.stringify(data));
    router.push(`/hackathons/${data.id}`);
  }

  return (
    <main className="p-8 max-w-2xl mx-auto text-zinc-100">
      <h1 className="text-3xl font-bold mb-6">New Hackathon</h1>
      <form action={onSubmit} className="grid gap-4">
        <input name="title" placeholder="Title" required className="p-3 bg-zinc-900 rounded border border-zinc-800" />
        <textarea name="description" placeholder="Description" rows={3} className="p-3 bg-zinc-900 rounded border border-zinc-800" />
        <input name="prize" type="number" step="0.01" placeholder="Prize (USDC)" required className="p-3 bg-zinc-900 rounded border border-zinc-800" />
        <input name="deadline" type="datetime-local" required className="p-3 bg-zinc-900 rounded border border-zinc-800" />
        <input name="judges" placeholder="Judge pubkeys (comma-sep)" required className="p-3 bg-zinc-900 rounded border border-zinc-800" />
        <input name="threshold" type="number" placeholder="Threshold" required className="p-3 bg-zinc-900 rounded border border-zinc-800" />
        <input name="depositorAta" placeholder="Your USDC ATA" required className="p-3 bg-zinc-900 rounded border border-zinc-800" />
        <button type="submit" disabled={submitting} className="p-3 bg-emerald-500 text-black font-semibold rounded">
          {submitting ? "Submitting…" : "Create Hackathon"}
        </button>
      </form>
    </main>
  );
}
```

```bash
git add apps/web
git commit -m "feat(web): create hackathon flow (UI + API composes deposit+init)"
```

## Task 4.6: Submit endpoint

**Files:** `apps/web/src/app/api/hackathons/[id]/submit/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

interface Body { agentPubkey: string; repoUrl: string; }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Body;
  const sb = supabaseService();
  const { error } = await sb.from("solana_submissions").upsert({
    hackathon_id: Number(id), agent_pubkey: body.agentPubkey, repo_url: body.repoUrl,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

```bash
git add apps/web
git commit -m "feat(web): POST /api/hackathons/[id]/submit"
```

## Task 4.7: Register agent flow

**Files:** `apps/web/src/app/api/agents/register/route.ts`, `apps/web/src/app/agents/register/page.tsx`

- [ ] **Step 1: API**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { makeUmi, registerAgent } from "@buildersclaw/solana-integration";
import { supabaseService } from "@/lib/supabase";
import { env } from "@/lib/env";

interface Body {
  ownerWallet: string; name: string; description: string; image: string;
  webEndpoint: string; a2aEndpoint?: string; mcpEndpoint?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const umi = makeUmi({
    rpcUrl: env.SOLANA_RPC, payerKeypairPath: process.env.SOLANA_BACKEND_KEYPAIR!,
  });
  const services = [
    { name: "web" as const, endpoint: body.webEndpoint },
    ...(body.a2aEndpoint ? [{ name: "A2A" as const, endpoint: body.a2aEndpoint, version: "0.3.0" }] : []),
    ...(body.mcpEndpoint ? [{ name: "MCP" as const, endpoint: body.mcpEndpoint, version: "2025-06-18" }] : []),
  ];
  const agent = await registerAgent(umi, {
    name: body.name, description: body.description, image: body.image, services,
  });
  const sb = supabaseService();
  await sb.from("solana_agents").insert({
    pubkey: agent.assetPubkey, owner_wallet: body.ownerWallet,
    name: body.name, description: body.description,
    identity_pda: agent.identityPda, registration_uri: agent.registrationUri,
  });
  return NextResponse.json(agent);
}
```

- [ ] **Step 2: UI**

```tsx
"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function RegisterAgent() {
  const { publicKey } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function onSubmit(formData: FormData) {
    if (!publicKey) return alert("Connect wallet");
    setSubmitting(true);
    const body = {
      ownerWallet: publicKey.toString(),
      name: formData.get("name"), description: formData.get("description"),
      image: formData.get("image"), webEndpoint: formData.get("webEndpoint"),
    };
    const res = await fetch("/api/agents/register", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    setResult(await res.json());
    setSubmitting(false);
  }

  return (
    <main className="p-8 max-w-2xl mx-auto text-zinc-100">
      <h1 className="text-3xl font-bold mb-6">Register Agent</h1>
      <form action={onSubmit} className="grid gap-4">
        <input name="name" placeholder="Agent name" required className="p-3 bg-zinc-900 rounded" />
        <textarea name="description" rows={3} placeholder="Description" required className="p-3 bg-zinc-900 rounded" />
        <input name="image" placeholder="Image URL" required className="p-3 bg-zinc-900 rounded" />
        <input name="webEndpoint" placeholder="Web endpoint" required className="p-3 bg-zinc-900 rounded" />
        <button disabled={submitting} className="p-3 bg-emerald-500 text-black font-semibold rounded">
          {submitting ? "Minting on Metaplex…" : "Register"}
        </button>
      </form>
      {result && <pre className="mt-6 p-4 bg-zinc-900 rounded text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
```

```bash
git add apps/web
git commit -m "feat(web): register agent flow (Metaplex Core + identity)"
```

## Task 4.8: Ceremony page (the demo star)

**Files:**
- `apps/web/src/components/{TxLink,CeremonyView}.tsx`
- `apps/web/src/app/api/hackathons/[id]/{settle,ballots}/route.ts`
- `apps/web/src/app/hackathons/[id]/ceremony/page.tsx`

- [ ] **Step 1: TxLink**

```tsx
export function TxLink({ sig, label }: { sig: string; label?: string }) {
  return (
    <a href={`https://solscan.io/tx/${sig}?cluster=devnet`} target="_blank"
       className="font-mono text-sm text-emerald-400 underline">
      {label ?? sig.slice(0, 8) + "…"}
    </a>
  );
}
```

- [ ] **Step 2: Ballots GET endpoint**

```typescript
import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAnon.from("judge_ballots").select("*").eq("hackathon_id", id);
  return NextResponse.json(data ?? []);
}
```

- [ ] **Step 3: Settle POST endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { EscrowClient, VerdictClient, makeUmi, launchAgentToken } from "@buildersclaw/solana-integration";
import { supabaseService } from "@/lib/supabase";
import { env } from "@/lib/env";
import * as fs from "node:fs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseService();
  const { data: hack } = await sb.from("solana_hackathons").select("*").eq("id", id).single();
  if (!hack) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: ballots } = await sb.from("judge_ballots").select("*").eq("hackathon_id", id);
  if (!ballots || ballots.length < hack.threshold) {
    return NextResponse.json({ error: "threshold not yet reached" }, { status: 400 });
  }

  const counts = new Map<string, number>();
  for (const b of ballots) counts.set(b.winner_agent, (counts.get(b.winner_agent) ?? 0) + 1);
  const [winner] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  const secret = JSON.parse(fs.readFileSync(process.env.SOLANA_BACKEND_KEYPAIR!, "utf-8"));
  const backend = Keypair.fromSecretKey(Uint8Array.from(secret));
  const conn = new Connection(env.SOLANA_RPC, "confirmed");
  const verdict = new VerdictClient(conn, backend);
  const escrow = new EscrowClient(conn, backend);

  const winnerPubkey = new PublicKey(winner);
  const winnerAta = getAssociatedTokenAddressSync(new PublicKey(env.USDC_MINT), winnerPubkey, true);
  const [vaultPda] = escrow.vaultPda(BigInt(id));
  const [vaultAta] = escrow.vaultAtaPda(vaultPda);
  const [hackPda] = verdict.hackathonPda(BigInt(id));
  const ballotPdas = ballots.map(b => verdict.ballotPda(hackPda, new PublicKey(b.judge_pubkey))[0]);

  const settleTx = await verdict.settleVerdict({
    hackathonId: BigInt(id), prizeVault: vaultPda, vaultAta, winnerAta,
    escrowProgramId: new PublicKey(env.ESCROW_PROGRAM_ID), ballotPdas,
  });

  const umi = makeUmi({
    rpcUrl: env.SOLANA_RPC, payerKeypairPath: process.env.SOLANA_BACKEND_KEYPAIR!,
  });
  const launch = await launchAgentToken(umi, {
    agentAsset: winner, name: `${hack.title} Winner`, symbol: "WIN",
    image: "https://arweave.net/placeholder",
  });

  await sb.from("solana_hackathons").update({ status: "Settled", verdict_winner: winner }).eq("id", id);
  return NextResponse.json({ winner, settleTx, launch });
}
```

- [ ] **Step 4: CeremonyView component**

```tsx
"use client";
import { useEffect, useState } from "react";
import { TxLink } from "./TxLink";

interface Props { hackathonId: string; threshold: number; totalJudges: number; }

export function CeremonyView({ hackathonId, threshold, totalJudges }: Props) {
  const [ballots, setBallots] = useState<any[]>([]);
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const tick = async () => {
      const r = await fetch(`/api/hackathons/${hackathonId}/ballots`);
      if (r.ok) setBallots(await r.json());
    };
    tick(); const i = setInterval(tick, 3000);
    return () => clearInterval(i);
  }, [hackathonId]);

  async function settle() {
    setSettling(true);
    const r = await fetch(`/api/hackathons/${hackathonId}/settle`, { method: "POST" });
    setResult(await r.json()); setSettling(false);
  }

  const canSettle = ballots.length >= threshold;

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex justify-between mb-2">
          <span>Ballots</span>
          <span>{ballots.length} / {totalJudges} (threshold {threshold})</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (ballots.length / threshold) * 100)}%` }} />
        </div>
      </div>
      <ul className="grid gap-2">
        {ballots.map(b => (
          <li key={b.judge_pubkey} className="p-3 bg-zinc-900 rounded flex justify-between text-sm">
            <span className="font-mono">{b.judge_pubkey.slice(0, 8)}…</span>
            <span>voted <span className="text-emerald-400">{b.winner_agent.slice(0, 8)}…</span></span>
            <TxLink sig={b.tx_signature} label="tx" />
          </li>
        ))}
      </ul>
      <button onClick={settle} disabled={!canSettle || settling}
        className="p-4 bg-emerald-500 text-black font-bold rounded text-lg disabled:opacity-50">
        {settling ? "Settling…" : canSettle ? "Settle Now" : "Waiting for quorum"}
      </button>
      {result && (
        <div className="grid gap-3">
          <div className="p-4 bg-emerald-950/40 border border-emerald-700 rounded">
            <div className="text-xs uppercase text-emerald-400">1. Verdict settled</div>
            <TxLink sig={result.settleTx} label="View on Solscan →" />
          </div>
          <div className="p-4 bg-emerald-950/40 border border-emerald-700 rounded">
            <div className="text-xs uppercase text-emerald-400">2. Token launched</div>
            <a href={`https://solscan.io/token/${result.launch.mint}?cluster=devnet`} target="_blank" className="text-emerald-400 underline font-mono text-sm">
              {result.launch.mint}
            </a>
          </div>
          <div className="p-4 bg-emerald-500/10 border border-emerald-500 rounded text-center">
            <div className="text-3xl font-bold">🏆 {result.winner.slice(0, 12)}…</div>
            <div className="text-zinc-400 text-sm mt-1">winner</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Ceremony page**

```tsx
import { supabaseAnon } from "@/lib/supabase";
import { CeremonyView } from "@/components/CeremonyView";

export const dynamic = "force-dynamic";

export default async function CeremonyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: hack } = await supabaseAnon.from("solana_hackathons").select("*").eq("id", id).single();
  if (!hack) return <main className="p-8">Not found</main>;
  return (
    <main className="p-8 max-w-3xl mx-auto text-zinc-100">
      <h1 className="text-3xl font-bold mb-2">{hack.title}</h1>
      <p className="text-zinc-500 mb-6">Live ceremony — {hack.judges.length} judges, threshold {hack.threshold}</p>
      <CeremonyView hackathonId={id} threshold={hack.threshold} totalJudges={hack.judges.length} />
    </main>
  );
}
```

```bash
git add apps/web
git commit -m "feat(web): ceremony page with live ballots + settle + Genesis launch"
```

## Task 4.9: Agent profile page

**Files:** `apps/web/src/app/agents/[pubkey]/page.tsx`

```tsx
import { supabaseAnon } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AgentPage({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey } = await params;
  const { data: agent } = await supabaseAnon.from("solana_agents").select("*").eq("pubkey", pubkey).single();
  const { data: wins } = await supabaseAnon.from("solana_hackathons")
    .select("id,title,prize_amount").eq("verdict_winner", pubkey);
  if (!agent) return <main className="p-8">Not found</main>;
  const totalEarned = (wins ?? []).reduce((s: number, w: any) => s + w.prize_amount, 0) / 1e6;
  return (
    <main className="p-8 max-w-3xl mx-auto text-zinc-100 grid gap-6">
      <header>
        <h1 className="text-3xl font-bold">{agent.name}</h1>
        <p className="text-zinc-500 font-mono text-sm">{agent.pubkey}</p>
        <a href={`https://metaplex.com/agents/${agent.pubkey}`} target="_blank" className="text-emerald-400 underline text-sm">
          View on Metaplex registry →
        </a>
      </header>
      <p>{agent.description}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-900 rounded"><div className="text-xs text-zinc-500">Hackathons won</div><div className="text-2xl font-bold">{wins?.length ?? 0}</div></div>
        <div className="p-4 bg-zinc-900 rounded"><div className="text-xs text-zinc-500">Total USDC earned</div><div className="text-2xl font-bold">{totalEarned.toFixed(2)}</div></div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Wins</h2>
        <ul className="grid gap-2">
          {(wins ?? []).map((w: any) => (
            <li key={w.id} className="p-3 bg-zinc-900 rounded flex justify-between">
              <span>{w.title}</span><span className="text-emerald-400">{(w.prize_amount / 1e6).toFixed(2)} USDC</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
```

```bash
git add apps/web
git commit -m "feat(web): agent profile page with track record"
```
