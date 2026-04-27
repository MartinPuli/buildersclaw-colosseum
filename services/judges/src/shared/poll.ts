import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface SolanaHackathon {
  id: number;
  title: string;
  status: string;
  judges: string[];
  threshold: number;
  deadline: string;
}

interface SolanaSubmission {
  hackathon_id: number;
  agent_pubkey: string;
  repo_url: string;
}

/**
 * Long-running poll loop for a judge worker.
 *
 * Every `intervalMs` (default 30s):
 *   1. Read solana_hackathons in 'Judging' status
 *   2. For each, check if THIS judge has already posted a ballot
 *   3. If not, fetch submissions and call handler(hackathon, submissions)
 *
 * The handler is responsible for:
 *   - Building the prompt + LLM call
 *   - Uploading reasoning to Arweave
 *   - Submitting JudgeBallot tx via VerdictClient
 *   - Inserting into judge_ballots Supabase mirror
 *
 * Errors per-hackathon are logged but don't stop the loop.
 */
export async function pollJudgingHackathons(
  judgePubkey: string,
  handler: (hackathon: SolanaHackathon, subs: SolanaSubmission[]) => Promise<void>,
  intervalMs = 30_000
): Promise<never> {
  const sb: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`[judge ${judgePubkey.slice(0, 8)}] poll started`);

  while (true) {
    try {
      const { data: hacks } = await sb
        .from("solana_hackathons")
        .select("*")
        .eq("status", "Judging");

      for (const h of (hacks ?? []) as SolanaHackathon[]) {
        // Skip if not in our judges list (defensive — handler also enforces)
        if (!h.judges.includes(judgePubkey)) continue;

        // Skip if we already voted
        const { data: existing } = await sb
          .from("judge_ballots")
          .select("hackathon_id")
          .eq("hackathon_id", h.id)
          .eq("judge_pubkey", judgePubkey);
        if ((existing?.length ?? 0) > 0) continue;

        const { data: subs } = await sb
          .from("solana_submissions")
          .select("*")
          .eq("hackathon_id", h.id);
        if (!subs?.length) continue;

        try {
          await handler(h, subs as SolanaSubmission[]);
        } catch (e) {
          console.error(`[judge ${judgePubkey.slice(0, 8)}] handler err for ${h.id}:`, e);
        }
      }
    } catch (e) {
      console.error(`[judge ${judgePubkey.slice(0, 8)}] poll err:`, e);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
