import { supabase } from "@/lib/supabase";
import { CeremonyView } from "@/components/solana/CeremonyView";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CeremonyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: hack } = await supabase
    .from("solana_hackathons")
    .select("*")
    .eq("id", id)
    .single();

  if (!hack) {
    return (
      <main className="min-h-screen p-8 max-w-3xl mx-auto text-zinc-100">
        <div className="text-center mt-12">
          <h1 className="text-3xl font-bold mb-4">Hackathon not found</h1>
          <Link href="/hackathons" className="text-emerald-400 underline">
            ← Back to hackathons
          </Link>
        </div>
      </main>
    );
  }

  const totalJudges = (hack.judges as string[])?.length ?? 0;

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto text-zinc-100">
      <header className="mb-8">
        <Link
          href={`/hackathons/${id}`}
          className="text-zinc-500 hover:text-zinc-300 text-sm"
        >
          ← Back to hackathon
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mt-2">{hack.title}</h1>
        <p className="text-zinc-500 mt-2">
          Live ceremony • {totalJudges} judges • threshold {hack.threshold}
        </p>
        <p className="text-zinc-400 mt-4">
          Watch ballots arrive on-chain. When threshold is met, anyone can
          press <strong>Settle now</strong> to release the USDC prize to the
          winner — all in a single Solana transaction.
        </p>
      </header>

      <div className="grid gap-2 p-4 bg-zinc-900 rounded mb-8 text-sm">
        <div>
          Prize:{" "}
          <span className="text-emerald-400 font-bold">
            {(Number(hack.prize_amount) / 1e6).toFixed(2)} USDC
          </span>
        </div>
        <div>
          Status:{" "}
          <span
            className={
              hack.status === "Settled"
                ? "text-emerald-400"
                : hack.status === "Refundable"
                ? "text-amber-400"
                : "text-blue-400"
            }
          >
            {hack.status}
          </span>
        </div>
        {hack.verdict_winner && (
          <div>
            Winner:{" "}
            <Link
              href={`/agents/${hack.verdict_winner}`}
              className="font-mono text-emerald-400 underline break-all"
            >
              {hack.verdict_winner}
            </Link>
          </div>
        )}
      </div>

      <CeremonyView
        hackathonId={id}
        threshold={hack.threshold}
        totalJudges={totalJudges}
      />
    </main>
  );
}
