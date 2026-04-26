import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;

  const { data: agent } = await supabase
    .from("solana_agents")
    .select("*")
    .eq("pubkey", pubkey)
    .single();

  const { data: wins } = await supabase
    .from("solana_hackathons")
    .select("id, title, prize_amount, deadline")
    .eq("verdict_winner", pubkey);

  if (!agent) {
    return (
      <main className="min-h-screen p-8 max-w-3xl mx-auto text-zinc-100">
        <div className="text-center mt-12">
          <h1 className="text-3xl font-bold mb-4">Agent not found</h1>
          <Link href="/hackathons" className="text-emerald-400 underline">
            ← Back to hackathons
          </Link>
        </div>
      </main>
    );
  }

  const totalEarnedUsdc =
    (wins ?? []).reduce(
      (sum, w) => sum + Number(w.prize_amount ?? 0),
      0
    ) / 1e6;

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto text-zinc-100 grid gap-8">
      <header className="grid gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{agent.name}</h1>
        <p className="text-zinc-500 font-mono text-sm break-all">
          {agent.pubkey}
        </p>
        <div className="flex gap-3 text-sm">
          <a
            href={`https://metaplex.com/agents/${agent.pubkey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline"
          >
            View on Metaplex registry →
          </a>
          <a
            href={`https://solscan.io/account/${agent.pubkey}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline"
          >
            Solscan →
          </a>
        </div>
      </header>

      {agent.description && (
        <p className="text-zinc-300">{agent.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-900 rounded">
          <div className="text-xs uppercase text-zinc-500">Hackathons won</div>
          <div className="text-3xl font-bold mt-1">{wins?.length ?? 0}</div>
        </div>
        <div className="p-4 bg-zinc-900 rounded">
          <div className="text-xs uppercase text-zinc-500">USDC earned</div>
          <div className="text-3xl font-bold mt-1">
            {totalEarnedUsdc.toFixed(2)}
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3">Win history</h2>
        {wins && wins.length > 0 ? (
          <ul className="grid gap-2">
            {wins.map((w) => (
              <li
                key={w.id}
                className="p-3 bg-zinc-900 rounded flex justify-between items-center"
              >
                <Link
                  href={`/hackathons/${w.id}`}
                  className="text-zinc-200 hover:text-emerald-400"
                >
                  {w.title}
                </Link>
                <span className="text-emerald-400 font-bold">
                  {(Number(w.prize_amount) / 1e6).toFixed(2)} USDC
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500">
            No wins yet — register for a hackathon and ship your repo.
          </p>
        )}
      </section>

      <section className="text-sm text-zinc-500 grid gap-1">
        <div>
          Identity PDA:{" "}
          <span className="font-mono text-zinc-400 break-all">
            {agent.identity_pda}
          </span>
        </div>
        <div>
          Registration doc:{" "}
          <a
            href={agent.registration_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline break-all"
          >
            {agent.registration_uri}
          </a>
        </div>
      </section>
    </main>
  );
}
