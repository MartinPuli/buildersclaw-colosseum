import OpenAI from "openai";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import {
  VerdictClient,
  makeUmi,
  uploadText,
} from "@buildersclaw/solana-integration";
import * as fs from "node:fs";

import { JUDGING_RUBRIC } from "./shared/rubric.js";
import { fetchRepoSnapshot } from "./shared/fetchRepo.js";
import { pollJudgingHackathons } from "./shared/poll.js";

const ai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
});

const conn = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
const judgeKp = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync(process.env.OPENROUTER_JUDGE_KEYPAIR!, "utf-8"))
  )
);
const verdict = new VerdictClient(conn, judgeKp);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const umi = makeUmi({
  rpcUrl: process.env.SOLANA_RPC_URL!,
  payerKeypairPath: process.env.OPENROUTER_JUDGE_KEYPAIR!,
});

await pollJudgingHackathons(judgeKp.publicKey.toString(), async (h, subs) => {
  console.log(
    `[openrouter] judging hackathon ${h.id} (${subs.length} submissions)`
  );

  const blob: string[] = [];
  for (const s of subs) {
    try {
      const repo = await fetchRepoSnapshot(s.repo_url);
      blob.push(
        `AGENT ${s.agent_pubkey}\nrepo: ${s.repo_url}\n\n${repo.files
          .map((f) => `--- ${f.path} ---\n${f.content}`)
          .join("\n\n")}`
      );
    } catch (e) {
      console.error(`[openrouter] fetch fail for ${s.repo_url}:`, e);
      blob.push(
        `AGENT ${s.agent_pubkey}\nrepo: ${s.repo_url}\n(fetch failed)`
      );
    }
  }
  const prompt = `${JUDGING_RUBRIC}\n\n=== Submissions ===\n${blob.join(
    "\n\n=====\n\n"
  )}`;

  const r = await ai.chat.completions.create({
    model: "anthropic/claude-3.5-sonnet",
    messages: [{ role: "user", content: prompt }],
  });
  const text = r.choices[0].message.content ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) {
    console.error(`[openrouter] no JSON in response for ${h.id}`);
    return;
  }
  const out = JSON.parse(m[0]);

  const reasoningUri = await uploadText(
    umi,
    JSON.stringify(out, null, 2),
    `openrouter-${h.id}.json`
  );

  const sig = await verdict.submitBallot({
    hackathonId: BigInt(h.id),
    judge: judgeKp,
    winnerAgent: new PublicKey(out.winner_pubkey),
    scoreRoot: Array(32).fill(0),
    reasoningUri,
  });

  await sb.from("judge_ballots").insert({
    hackathon_id: h.id,
    judge_pubkey: judgeKp.publicKey.toString(),
    winner_agent: out.winner_pubkey,
    score_root: Buffer.alloc(32).toString("hex"),
    reasoning_uri: reasoningUri,
    tx_signature: sig,
    signed_at: new Date().toISOString(),
  });

  console.log(
    `[openrouter] hackathon ${h.id} → ${out.winner_pubkey.slice(0, 8)}… (sig ${sig.slice(0, 8)}…)`
  );
});
