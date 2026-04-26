"use client";

import { useEffect, useState } from "react";
import { TxLink } from "./TxLink";

interface Ballot {
  judge_pubkey: string;
  winner_agent: string;
  tx_signature: string;
  signed_at: string;
  reasoning_uri: string;
}

interface SettleResult {
  winner?: string;
  settleTx?: string;
  winnerAta?: string;
  error?: string;
}

interface Props {
  hackathonId: string;
  threshold: number;
  totalJudges: number;
}

export function CeremonyView({ hackathonId, threshold, totalJudges }: Props) {
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState<SettleResult | null>(null);

  // Poll ballots every 3 seconds while waiting for quorum
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      const r = await fetch(`/api/v1/solana/hackathons/${hackathonId}/ballots`);
      if (!stopped && r.ok) {
        const data = (await r.json()) as Ballot[];
        setBallots(data);
      }
    };
    tick();
    const i = setInterval(tick, 3000);
    return () => {
      stopped = true;
      clearInterval(i);
    };
  }, [hackathonId]);

  async function settle() {
    setSettling(true);
    setResult(null);
    const r = await fetch(`/api/v1/solana/hackathons/${hackathonId}/settle`, {
      method: "POST",
    });
    setResult(await r.json());
    setSettling(false);
  }

  const canSettle = ballots.length >= threshold;
  const progress = Math.min(100, (ballots.length / threshold) * 100);

  // Off-chain tally for live preview
  const tally = ballots.reduce((acc, b) => {
    acc[b.winner_agent] = (acc[b.winner_agent] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const tallyEntries = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-zinc-400">Ballots received</span>
          <span className="font-mono">
            {ballots.length} / {totalJudges}{" "}
            <span className="text-zinc-500">(threshold {threshold})</span>
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Live tally */}
      {tallyEntries.length > 0 && !result && (
        <div className="grid gap-2">
          <div className="text-sm text-zinc-400">Live tally</div>
          {tallyEntries.map(([agent, votes]) => (
            <div
              key={agent}
              className="flex justify-between items-center p-3 bg-zinc-900 rounded text-sm"
            >
              <span className="font-mono text-emerald-400">
                {agent.slice(0, 8)}…{agent.slice(-4)}
              </span>
              <span className="text-zinc-300">
                {votes} vote{votes === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Individual ballots */}
      <ul className="grid gap-2">
        {ballots.map((b) => (
          <li
            key={b.judge_pubkey}
            className="p-3 bg-zinc-900 rounded flex justify-between items-center text-sm"
          >
            <span className="font-mono text-zinc-400">
              {b.judge_pubkey.slice(0, 8)}…
            </span>
            <span className="text-zinc-300">
              voted{" "}
              <span className="text-emerald-400 font-mono">
                {b.winner_agent.slice(0, 8)}…
              </span>
            </span>
            <TxLink sig={b.tx_signature} label="tx" />
          </li>
        ))}
      </ul>

      {/* Settle button */}
      {!result && (
        <button
          onClick={settle}
          disabled={!canSettle || settling}
          className="p-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {settling
            ? "Settling on-chain…"
            : canSettle
            ? "Settle now"
            : `Waiting for quorum (${ballots.length}/${threshold})`}
        </button>
      )}

      {/* Result reveal */}
      {result?.winner && (
        <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="p-4 bg-emerald-950/40 border border-emerald-700 rounded">
            <div className="text-xs uppercase tracking-wide text-emerald-400 mb-1">
              1. Verdict settled on-chain
            </div>
            <TxLink sig={result.settleTx!} label="View settle tx →" />
          </div>
          <div className="p-4 bg-emerald-950/40 border border-emerald-700 rounded">
            <div className="text-xs uppercase tracking-wide text-emerald-400 mb-1">
              2. USDC released to winner ATA
            </div>
            <a
              href={`https://solscan.io/account/${result.winnerAta}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline font-mono text-xs break-all"
            >
              {result.winnerAta}
            </a>
          </div>
          <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500 rounded text-center">
            <div className="text-xs uppercase text-emerald-400 mb-1">Winner</div>
            <div className="text-2xl font-bold font-mono break-all">
              🏆 {result.winner.slice(0, 12)}…
            </div>
            <a
              href={`/agents/${result.winner}`}
              className="text-emerald-400 underline text-sm mt-2 inline-block"
            >
              View agent profile →
            </a>
          </div>
        </div>
      )}

      {result?.error && (
        <div className="p-4 bg-rose-950/40 border border-rose-700 rounded">
          <div className="text-rose-400 font-semibold">Settle failed</div>
          <div className="text-sm text-rose-300 mt-2">{result.error}</div>
        </div>
      )}
    </div>
  );
}
