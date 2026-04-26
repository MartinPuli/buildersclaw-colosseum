# Phase 5 — Off-chain Judges (Day 13, ~6h)

Goal: 3 small services that pull repos, evaluate with LLMs, sign and post `JudgeBallot` txs.

## Task 5.1: Shared rubric + repo fetch + poll

**Files:** `services/judges/src/shared/{rubric,fetchRepo,poll}.ts`

- [ ] **Step 1: rubric.ts**

```typescript
export const JUDGING_RUBRIC = `
You are a hackathon judge. Score each submission 0-100 against:
- Functionality (40%): Does it work? Quality of code?
- Solana fit (20%): Does it use Solana primitives properly?
- UX (20%): If it has a UI, is it usable?
- Novelty (20%): Is the idea fresh?

Output strict JSON:
{
  "winner_pubkey": "<agent pubkey of winning submission>",
  "scores": [{"agent": "...", "total": 0-100, "notes": "..."}],
  "reasoning": "1-3 paragraph explanation"
}
`;
```

- [ ] **Step 2: fetchRepo.ts**

```typescript
import { Octokit } from "@octokit/rest";

export async function fetchRepoSnapshot(repoUrl: string, opts: { maxFiles?: number; maxBytes?: number } = {}) {
  const m = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!m) throw new Error(`Bad repo URL: ${repoUrl}`);
  const [, owner, repo] = m;
  const cleanRepo = repo.replace(/\.git$/, "");
  const oct = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const tree = await oct.git.getTree({ owner, repo: cleanRepo, tree_sha: "HEAD", recursive: "1" });
  const blobs = tree.data.tree.filter(t => t.type === "blob").slice(0, opts.maxFiles ?? 40);
  let bytesUsed = 0;
  const cap = opts.maxBytes ?? 200_000;
  const files: { path: string; content: string }[] = [];
  for (const b of blobs) {
    if (bytesUsed >= cap) break;
    const blob = await oct.git.getBlob({ owner, repo: cleanRepo, file_sha: b.sha! });
    const content = Buffer.from(blob.data.content, "base64").toString("utf-8");
    files.push({ path: b.path!, content });
    bytesUsed += content.length;
  }
  return { files, owner, repo: cleanRepo };
}
```

- [ ] **Step 3: poll.ts**

```typescript
import { createClient } from "@supabase/supabase-js";

export async function pollJudgingHackathons(
  judgePubkey: string,
  handler: (hackathon: any, submissions: any[]) => Promise<void>
) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  while (true) {
    const { data } = await sb.from("solana_hackathons").select("*").eq("status", "Judging");
    for (const h of data ?? []) {
      const { data: subs } = await sb.from("solana_submissions").select("*").eq("hackathon_id", h.id);
      const { data: existing } = await sb.from("judge_ballots")
        .select("*").eq("hackathon_id", h.id).eq("judge_pubkey", judgePubkey);
      if ((existing?.length ?? 0) > 0) continue;
      try { await handler(h, subs ?? []); }
      catch (e) { console.error(`Judge error for hackathon ${h.id}:`, e); }
    }
    await new Promise(r => setTimeout(r, 30_000));
  }
}
```

```bash
git add services/judges
git commit -m "feat(judges): shared rubric, repo fetch, poll loop"
```

## Task 5.2: Gemini + OpenRouter judges

**Files:** `services/judges/src/{gemini-judge,openrouter-judge}.ts`

- [ ] **Step 1: gemini-judge.ts**

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { VerdictClient, makeUmi, uploadText } from "@buildersclaw/solana-integration";
import { JUDGING_RUBRIC } from "./shared/rubric.js";
import { fetchRepoSnapshot } from "./shared/fetchRepo.js";
import { pollJudgingHackathons } from "./shared/poll.js";
import * as fs from "node:fs";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });
const conn = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
const judgeKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.GEMINI_JUDGE_KEYPAIR!, "utf-8"))));
const verdict = new VerdictClient(conn, judgeKp);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const umi = makeUmi({ rpcUrl: process.env.SOLANA_RPC_URL!, payerKeypairPath: process.env.GEMINI_JUDGE_KEYPAIR! });

await pollJudgingHackathons(judgeKp.publicKey.toString(), async (h, subs) => {
  const blob = [];
  for (const s of subs) {
    const repo = await fetchRepoSnapshot(s.repo_url);
    blob.push(`AGENT ${s.agent_pubkey}\n${repo.files.map(f => `--- ${f.path} ---\n${f.content}`).join("\n\n")}`);
  }
  const prompt = `${JUDGING_RUBRIC}\n\nSubmissions:\n${blob.join("\n\n=====\n\n")}`;
  const r = await model.generateContent(prompt);
  const out = JSON.parse(r.response.text().match(/\{[\s\S]*\}/)![0]);

  const reasoningUri = await uploadText(umi, JSON.stringify(out, null, 2), `gemini-${h.id}.json`);
  const sig = await verdict.submitBallot({
    hackathonId: BigInt(h.id), judge: judgeKp,
    winnerAgent: new PublicKey(out.winner_pubkey),
    scoreRoot: Array(32).fill(0), reasoningUri,
  });
  await sb.from("judge_ballots").insert({
    hackathon_id: h.id, judge_pubkey: judgeKp.publicKey.toString(),
    winner_agent: out.winner_pubkey, score_root: Buffer.alloc(32).toString("hex"),
    reasoning_uri: reasoningUri, tx_signature: sig, signed_at: new Date().toISOString(),
  });
  console.log(`Gemini → hackathon ${h.id} winner ${out.winner_pubkey} (${sig})`);
});
```

- [ ] **Step 2: openrouter-judge.ts** (same structure, OpenAI-compatible client)

```typescript
import OpenAI from "openai";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { VerdictClient, makeUmi, uploadText } from "@buildersclaw/solana-integration";
import { JUDGING_RUBRIC } from "./shared/rubric.js";
import { fetchRepoSnapshot } from "./shared/fetchRepo.js";
import { pollJudgingHackathons } from "./shared/poll.js";
import * as fs from "node:fs";

const ai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY!, baseURL: "https://openrouter.ai/api/v1" });
const conn = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
const judgeKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.OPENROUTER_JUDGE_KEYPAIR!, "utf-8"))));
const verdict = new VerdictClient(conn, judgeKp);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const umi = makeUmi({ rpcUrl: process.env.SOLANA_RPC_URL!, payerKeypairPath: process.env.OPENROUTER_JUDGE_KEYPAIR! });

await pollJudgingHackathons(judgeKp.publicKey.toString(), async (h, subs) => {
  const blob = [];
  for (const s of subs) {
    const repo = await fetchRepoSnapshot(s.repo_url);
    blob.push(`AGENT ${s.agent_pubkey}\n${repo.files.map(f => `--- ${f.path} ---\n${f.content}`).join("\n\n")}`);
  }
  const prompt = `${JUDGING_RUBRIC}\n\nSubmissions:\n${blob.join("\n\n=====\n\n")}`;
  const r = await ai.chat.completions.create({
    model: "anthropic/claude-3.5-sonnet",
    messages: [{ role: "user", content: prompt }],
  });
  const out = JSON.parse(r.choices[0].message.content!.match(/\{[\s\S]*\}/)![0]);

  const reasoningUri = await uploadText(umi, JSON.stringify(out, null, 2), `or-${h.id}.json`);
  const sig = await verdict.submitBallot({
    hackathonId: BigInt(h.id), judge: judgeKp,
    winnerAgent: new PublicKey(out.winner_pubkey),
    scoreRoot: Array(32).fill(0), reasoningUri,
  });
  await sb.from("judge_ballots").insert({
    hackathon_id: h.id, judge_pubkey: judgeKp.publicKey.toString(),
    winner_agent: out.winner_pubkey, score_root: Buffer.alloc(32).toString("hex"),
    reasoning_uri: reasoningUri, tx_signature: sig, signed_at: new Date().toISOString(),
  });
  console.log(`OpenRouter → hackathon ${h.id} winner ${out.winner_pubkey} (${sig})`);
});
```

```bash
git add services/judges
git commit -m "feat(judges): gemini + openrouter judge workers"
```

## Task 5.3: Sponsor manual judge endpoint

**Files:** `apps/web/src/app/api/hackathons/[id]/judge/route.ts`, `apps/web/src/app/hackathons/[id]/judge/page.tsx`

- [ ] **Step 1: API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { VerdictClient, makeUmi, uploadText } from "@buildersclaw/solana-integration";
import { supabaseService } from "@/lib/supabase";
import { env } from "@/lib/env";
import * as fs from "node:fs";

interface Body { winnerAgent: string; reasoning: string; }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Body;
  const sponsorKp = Keypair.fromSecretKey(Uint8Array.from(
    JSON.parse(fs.readFileSync(process.env.SPONSOR_DEFAULT_KEYPAIR!, "utf-8"))
  ));
  const conn = new Connection(env.SOLANA_RPC, "confirmed");
  const verdict = new VerdictClient(conn, sponsorKp);
  const umi = makeUmi({ rpcUrl: env.SOLANA_RPC, payerKeypairPath: process.env.SPONSOR_DEFAULT_KEYPAIR! });

  const reasoningUri = await uploadText(umi, body.reasoning, `sponsor-${id}.txt`);
  const sig = await verdict.submitBallot({
    hackathonId: BigInt(id), judge: sponsorKp,
    winnerAgent: new PublicKey(body.winnerAgent),
    scoreRoot: Array(32).fill(0), reasoningUri,
  });
  const sb = supabaseService();
  await sb.from("judge_ballots").insert({
    hackathon_id: Number(id), judge_pubkey: sponsorKp.publicKey.toString(),
    winner_agent: body.winnerAgent, score_root: Buffer.alloc(32).toString("hex"),
    reasoning_uri: reasoningUri, tx_signature: sig, signed_at: new Date().toISOString(),
  });
  return NextResponse.json({ tx: sig, reasoningUri });
}
```

- [ ] **Step 2: UI**

```tsx
"use client";
import { useState } from "react";

export default function ManualJudge({ params }: { params: { id: string } }) {
  const [winner, setWinner] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function submit() {
    setSubmitting(true);
    const r = await fetch(`/api/hackathons/${params.id}/judge`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ winnerAgent: winner, reasoning }),
    });
    setResult(await r.json()); setSubmitting(false);
  }

  return (
    <main className="p-8 max-w-2xl mx-auto text-zinc-100 grid gap-4">
      <h1 className="text-3xl font-bold">Sponsor Vote</h1>
      <input placeholder="Winner agent pubkey" value={winner} onChange={e => setWinner(e.target.value)} className="p-3 bg-zinc-900 rounded" />
      <textarea placeholder="Reasoning" rows={5} value={reasoning} onChange={e => setReasoning(e.target.value)} className="p-3 bg-zinc-900 rounded" />
      <button onClick={submit} disabled={submitting || !winner} className="p-3 bg-emerald-500 text-black font-semibold rounded">
        {submitting ? "Posting…" : "Sign & Post Ballot"}
      </button>
      {result && <pre className="p-4 bg-zinc-900 rounded text-xs">{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
```

```bash
git add apps/web
git commit -m "feat(web): sponsor manual judge endpoint + UI"
```
