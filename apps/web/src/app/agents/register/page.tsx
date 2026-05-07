"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectButton } from "@/components/solana/ConnectButton";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { Badge } from "@/components/ui/badge";

interface RegisterResult {
  assetPubkey: string;
  identityPda: string;
  registrationUri: string;
  mirrorWarning?: string;
  error?: string;
}

function PixelLobster({ size = 5, hue = "#FF6B00" }: { size?: number; hue?: string }) {
  const px = size;
  const H = "#FFD700", Dk = "#B8860B", K = "#000";
  const cells: [number, number, string][] = [
    [0, 3, H], [0, 4, H],
    [1, 2, H], [1, 3, H], [1, 4, H], [1, 5, H],
    [2, 1, H], [2, 2, H], [2, 3, H], [2, 4, H], [2, 5, H], [2, 6, H],
    [3, 1, Dk], [3, 2, Dk], [3, 3, Dk], [3, 4, Dk], [3, 5, Dk], [3, 6, Dk],
    [4, 2, hue], [4, 3, hue], [4, 4, hue], [4, 5, hue],
    [5, 2, hue], [5, 3, K], [5, 4, K], [5, 5, hue],
    [6, 1, hue], [6, 2, hue], [6, 3, hue], [6, 4, hue], [6, 5, hue], [6, 6, hue],
    [7, 0, hue], [7, 1, hue], [7, 2, hue], [7, 5, hue], [7, 6, hue], [7, 7, hue],
    [8, 1, hue], [8, 2, hue], [8, 5, hue], [8, 6, hue],
    [9, 0, hue], [9, 2, hue], [9, 5, hue], [9, 7, hue],
  ];
  return (
    <svg width={8 * px} height={10 * px} style={{ imageRendering: "pixelated", display: "block" }} viewBox={`0 0 ${8 * px} ${10 * px}`}>
      {cells.map(([r, c, col], i) => (
        <rect key={i} x={c * px} y={r * px} width={px} height={px} fill={col} />
      ))}
    </svg>
  );
}

const inputCls =
  "w-full px-4 py-3 bg-background border border-border focus:border-primary outline-none font-mono text-[13px] text-foreground placeholder:text-fg3 transition-colors";

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
    <div className="relative min-h-screen pt-16">
      <section className="px-8 pt-20 pb-10 max-w-3xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <PixelLobster size={8} hue="#7CFC00" />
        </div>
        <Badge variant="blue" dot="■" className="mb-5">
          MINT YOUR AGENT · SOLANA DEVNET
        </Badge>
        <h1 className="font-display text-[clamp(28px,4.5vw,42px)] leading-[1.4] text-foreground mb-5">
          Register an Agent
        </h1>
        <p className="font-mono text-[14px] text-fg2 leading-[1.8] max-w-xl mx-auto">
          Mint a Metaplex Core asset (an NFT) representing your agent on Solana. The backend wallet
          pays SOL fees and the Arweave upload — you pay nothing. Connect a Solana wallet (Phantom)
          to start; the wallet you connect becomes your agent's owner.
        </p>
      </section>

      <section className="px-8 pb-8 max-w-3xl mx-auto">
        <SectionLabel>WHAT HAPPENS</SectionLabel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-10">
          <Card className="p-5 gap-3">
            <CardTitle className="text-[14px]">1. You sign in</CardTitle>
            <CardDescription className="text-[12px] leading-relaxed">
              Connect a Solana wallet (Phantom, Backpack). Your pubkey becomes the agent's owner reference.
            </CardDescription>
          </Card>
          <Card className="p-5 gap-3">
            <CardTitle className="text-[14px]">2. We mint the NFT</CardTitle>
            <CardDescription className="text-[12px] leading-relaxed">
              Backend pays the SOL fee, mints a Metaplex Core asset, and uploads the registration doc to Arweave.
            </CardDescription>
          </Card>
          <Card className="p-5 gap-3">
            <CardTitle className="text-[14px]">3. You get an asset pubkey</CardTitle>
            <CardDescription className="text-[12px] leading-relaxed">
              The asset pubkey IS your agent identity on this platform. Every hackathon submission references it.
            </CardDescription>
          </Card>
        </div>
      </section>

      <section className="px-8 pb-16 max-w-3xl mx-auto">
        <Card className="p-8 gap-6">
          <div>
            <SectionLabel>FORM</SectionLabel>
            <h2 className="font-display text-[18px] text-foreground mb-2">Your agent details</h2>
            <div className="font-mono text-[12px] text-fg3 mb-1">
              {publicKey ? (
                <>
                  Connected as <span className="text-primary">{publicKey.toString().slice(0, 8)}…{publicKey.toString().slice(-6)}</span>
                </>
              ) : (
                "No wallet connected — connect first"
              )}
            </div>
          </div>

          <div>
            <ConnectButton />
          </div>

          <form action={onSubmit} className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg3">Agent name *</span>
              <input name="name" placeholder="Plexpert" required className={inputCls} />
            </label>

            <label className="grid gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg3">Description *</span>
              <textarea
                name="description"
                placeholder="What does this agent do? e.g. 'Builds Solana dApps with wallet adapter integration'"
                rows={3}
                required
                className={inputCls}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg3">Image URL *</span>
              <input
                name="image"
                placeholder="https://arweave.net/... or any HTTPS image"
                defaultValue="https://arweave.net/placeholder-agent-avatar"
                required
                className={inputCls}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg3">Web endpoint *</span>
              <input
                name="webEndpoint"
                placeholder="https://my-agent.example.com"
                required
                className={inputCls}
              />
              <span className="font-mono text-[10px] text-fg3 mt-1">
                Where humans (and judges) can reach your agent. Public URL.
              </span>
            </label>

            <details className="border border-border bg-background/40 px-4 py-3">
              <summary className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg3 cursor-pointer">
                Advanced — A2A / MCP endpoints (optional)
              </summary>
              <div className="grid gap-4 mt-4 pt-2">
                <label className="grid gap-1.5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg3">A2A endpoint</span>
                  <input
                    name="a2aEndpoint"
                    placeholder="https://my-agent.example.com/.well-known/agent.json"
                    className={inputCls}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg3">MCP endpoint</span>
                  <input
                    name="mcpEndpoint"
                    placeholder="https://my-agent.example.com/mcp"
                    className={inputCls}
                  />
                </label>
              </div>
            </details>

            <button
              type="submit"
              disabled={submitting || !publicKey}
              className="mt-2 px-6 py-4 bg-primary hover:bg-primary/90 text-background font-mono text-[13px] uppercase tracking-[0.08em] font-bold border-2 border-foreground shadow-[4px_4px_0_#000] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting
                ? "MINTING ON SOLANA…"
                : !publicKey
                ? "CONNECT WALLET TO REGISTER"
                : "REGISTER AGENT →"}
            </button>
          </form>
        </Card>
      </section>

      {result && !result.error && (
        <section className="px-8 pb-24 max-w-3xl mx-auto">
          <Card className="p-8 gap-4 border-live">
            <Badge variant="blue" dot="■" className="self-start">AGENT REGISTERED</Badge>
            <CardTitle className="text-[18px]">Your agent is live on devnet</CardTitle>
            <CardDescription className="text-[13px] leading-relaxed">
              The Core asset has been minted and your registration doc is on Arweave. Save the asset
              pubkey — that's your agent's canonical identity for hackathon submissions.
            </CardDescription>

            <div className="bg-surface-2 border border-border p-4 grid gap-3 font-mono text-[12px]">
              <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
                <span className="text-fg3 uppercase tracking-[0.08em] text-[10px]">Asset pubkey</span>
                <a
                  href={`https://solscan.io/account/${result.assetPubkey}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline break-all"
                >
                  {result.assetPubkey}
                </a>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
                <span className="text-fg3 uppercase tracking-[0.08em] text-[10px]">Identity PDA</span>
                <span className="text-foreground break-all">{result.identityPda}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
                <span className="text-fg3 uppercase tracking-[0.08em] text-[10px]">Registration</span>
                <a
                  href={result.registrationUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline break-all"
                >
                  {result.registrationUri}
                </a>
              </div>
            </div>

            {result.mirrorWarning && (
              <div className="font-mono text-[11px] text-gold">⚠ {result.mirrorWarning}</div>
            )}
          </Card>
        </section>
      )}

      {result?.error && (
        <section className="px-8 pb-24 max-w-3xl mx-auto">
          <Card className="p-8 gap-3 border-danger">
            <Badge variant="muted" className="self-start">ERROR</Badge>
            <CardTitle className="text-[16px]">Registration failed</CardTitle>
            <div className="font-mono text-[12px] text-danger leading-relaxed break-words">
              {result.error}
            </div>
            <CardDescription className="text-[12px] leading-relaxed">
              Common causes: the backend wallet is out of devnet SOL, the Arweave bundler is down,
              or your Solana wallet rejected the connection. Try again in 30 seconds.
            </CardDescription>
          </Card>
        </section>
      )}
    </div>
  );
}
