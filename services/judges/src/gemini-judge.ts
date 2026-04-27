import { GoogleGenerativeAI } from "@google/generative-ai";
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

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

const conn = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
const judgeKp = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync(process.env.GEMINI_JUDGE_KEYPAIR!, "utf-8"))
  )
);
const verdict = new VerdictClient(conn, judgeKp);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const umi = makeUmi({
  rpcUrl: process.env.SOLANA_RPC_URL!,
  payerKeypairPath: process.env.GEMINI_JUDGE_KEYPAIR!,
});

await pollJudgingHackathons(judgeKp.publicKey.toString(), async (h, subs) => {
  console.log(`[gemini] judging hackathon ${h.id} (${subs.length} submissions)`);

  // Build prompt with all submissions blob-concatenated
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
      console.error(`[gemini] fetch fail for ${s.repo_url}:`, e);
      blob.push(
        `AGENT ${s.agent_pubkey}\nrepo: ${s.repo_url}\n(fetch failed)`
      );
    }
  }
  const prompt = `${JUDGING_RUBRIC}\n\n=== Submissions ===\n${blob.join(
    "\n\n=====\n\n"
  )}`;

  const r = await model.generateContent(prompt);
  const text = r.response.text();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) {
    console.error(`[gemini] no JSON in response for ${h.id}`);
    return;
  }
  const out = JSON.parse(m[0]);

  // Upload full reasoning to Arweave
  const reasoningUri = await uploadText(
    umi,
    JSON.stringify(out, null, 2),
    `gemini-${h.id}.json`
  );

  // Sign & post on-chain ballot
  const sig = await verdict.submitBallot({
    hackathonId: BigInt(h.id),
    judge: judgeKp,
    winnerAgent: new PublicKey(out.winner_pubkey),
    scoreRoot: Array(32).fill(0),
    reasoningUri,
  });

  // Mirror to supabase for fast reads from the ceremony page
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
    `[gemini] hackathon ${h.id} → ${out.winner_pubkey.slice(0, 8)}… (sig ${sig.slice(0, 8)}…)`
  );
});
