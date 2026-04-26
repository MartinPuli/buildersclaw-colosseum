"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectButton } from "@/components/solana/ConnectButton";

interface RegisterResult {
  assetPubkey: string;
  identityPda: string;
  registrationUri: string;
  mirrorWarning?: string;
  error?: string;
}

export default function RegisterAgentPage() {
  const { publicKey } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);

  async function onSubmit(formData: FormData) {
    if (!publicKey) {
      alert("Connect your Solana wallet first");
      return;
    }
    setSubmitting(true);
    setResult(null);

    const body = {
      ownerWallet: publicKey.toString(),
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      image: formData.get("image") as string,
      webEndpoint: formData.get("webEndpoint") as string,
      a2aEndpoint: (formData.get("a2aEndpoint") as string) || undefined,
      mcpEndpoint: (formData.get("mcpEndpoint") as string) || undefined,
    };

    const res = await fetch("/api/v1/solana/agents/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setResult(data);
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto text-zinc-100">
      <header className="mb-8 grid gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Register an Agent</h1>
        <p className="text-zinc-400">
          Mint your agent's on-chain identity on Solana via Metaplex Agent
          Registry. The agent gets a Core NFT, an ERC-8004 registration
          document on Arweave, and shows up on the public Metaplex agents page.
        </p>
        <ConnectButton />
      </header>

      <form action={onSubmit} className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm text-zinc-400">Agent name</span>
          <input
            name="name"
            placeholder="Plexpert"
            required
            className="p-3 bg-zinc-900 rounded border border-zinc-800 focus:border-emerald-500 outline-none"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-zinc-400">Description</span>
          <textarea
            name="description"
            placeholder="What does this agent do?"
            rows={3}
            required
            className="p-3 bg-zinc-900 rounded border border-zinc-800 focus:border-emerald-500 outline-none"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-zinc-400">Image URL (Arweave or HTTPS)</span>
          <input
            name="image"
            placeholder="https://arweave.net/..."
            required
            className="p-3 bg-zinc-900 rounded border border-zinc-800 focus:border-emerald-500 outline-none"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-zinc-400">Web endpoint</span>
          <input
            name="webEndpoint"
            placeholder="https://yourapp.com/agent/<id>"
            required
            className="p-3 bg-zinc-900 rounded border border-zinc-800 focus:border-emerald-500 outline-none"
          />
        </label>

        <details>
          <summary className="text-sm text-zinc-500 cursor-pointer">
            Advanced (optional A2A / MCP endpoints)
          </summary>
          <div className="grid gap-4 mt-4">
            <input
              name="a2aEndpoint"
              placeholder="A2A agent-card.json URL (optional)"
              className="p-3 bg-zinc-900 rounded border border-zinc-800 focus:border-emerald-500 outline-none"
            />
            <input
              name="mcpEndpoint"
              placeholder="MCP server URL (optional)"
              className="p-3 bg-zinc-900 rounded border border-zinc-800 focus:border-emerald-500 outline-none"
            />
          </div>
        </details>

        <button
          type="submit"
          disabled={submitting || !publicKey}
          className="p-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting
            ? "Minting on Metaplex…"
            : !publicKey
            ? "Connect wallet to register"
            : "Register"}
        </button>
      </form>

      {result && !result.error && (
        <div className="mt-8 p-4 bg-emerald-950/40 border border-emerald-700 rounded grid gap-2">
          <div className="text-emerald-400 font-semibold">Agent registered ✓</div>
          <div className="text-sm">
            Asset:{" "}
            <a
              href={`https://solscan.io/account/${result.assetPubkey}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-400 underline break-all"
            >
              {result.assetPubkey}
            </a>
          </div>
          <div className="text-sm">
            Identity PDA:{" "}
            <span className="font-mono text-zinc-400 break-all">
              {result.identityPda}
            </span>
          </div>
          <div className="text-sm">
            Registration doc:{" "}
            <a
              href={result.registrationUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline break-all"
            >
              {result.registrationUri}
            </a>
          </div>
          {result.mirrorWarning && (
            <div className="text-amber-400 text-xs">⚠ {result.mirrorWarning}</div>
          )}
        </div>
      )}

      {result?.error && (
        <div className="mt-8 p-4 bg-rose-950/40 border border-rose-700 rounded">
          <div className="text-rose-400 font-semibold">Error</div>
          <div className="text-sm text-rose-300 mt-2">{result.error}</div>
        </div>
      )}
    </main>
  );
}
