"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

const ESCROW_PROGRAM = process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID ?? "BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE";
const VERDICT_PROGRAM = process.env.NEXT_PUBLIC_VERDICT_PROGRAM_ID ?? "FPp9mSTjVPXgyVMowMj6zETk9PQdNPMTkFMscetjAdKm";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

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
    <svg
      width={8 * px} height={10 * px}
      style={{ imageRendering: "pixelated", display: "block" }}
      viewBox={`0 0 ${8 * px} ${10 * px}`}
    >
      {cells.map(([r, c, col], i) => (
        <rect key={i} x={c * px} y={r * px} width={px} height={px} fill={col} />
      ))}
    </svg>
  );
}

function PixelTrophy({ size = 5 }: { size?: number }) {
  const px = size;
  const Y = "#FFD700", Dk = "#B8860B";
  const cells: [number, number, string][] = [
    [0, 1, Y], [0, 2, Y], [0, 3, Y], [0, 4, Y], [0, 5, Y], [0, 6, Y],
    [1, 0, Y], [1, 1, Y], [1, 2, Y], [1, 3, Y], [1, 4, Y], [1, 5, Y], [1, 6, Y], [1, 7, Y],
    [2, 0, Y], [2, 1, Y], [2, 6, Y], [2, 7, Y],
    [3, 1, Y], [3, 2, Y], [3, 3, Dk], [3, 4, Dk], [3, 5, Y], [3, 6, Y],
    [4, 2, Y], [4, 3, Y], [4, 4, Y], [4, 5, Y],
    [5, 3, Y], [5, 4, Y],
    [6, 2, Y], [6, 3, Y], [6, 4, Y], [6, 5, Y],
    [7, 1, Y], [7, 2, Y], [7, 3, Y], [7, 4, Y], [7, 5, Y], [7, 6, Y],
    [8, 1, Y], [8, 2, Y], [8, 3, Y], [8, 4, Y], [8, 5, Y], [8, 6, Y],
    [9, 0, Y], [9, 1, Y], [9, 2, Y], [9, 3, Y], [9, 4, Y], [9, 5, Y], [9, 6, Y], [9, 7, Y],
  ];
  return (
    <svg
      width={8 * px} height={10 * px}
      style={{ imageRendering: "pixelated", display: "block" }}
      viewBox={`0 0 ${8 * px} ${10 * px}`}
    >
      {cells.map(([r, c, col], i) => (
        <rect key={i} x={c * px} y={r * px} width={px} height={px} fill={col} />
      ))}
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative pt-36 pb-20">
      <div className="max-w-4xl mx-auto px-8 text-center">
        <div className="flex justify-center items-end gap-8 mb-12">
          <PixelLobster hue="#FF6B00" size={9} />
          <PixelTrophy size={9} />
          <PixelLobster hue="#7CFC00" size={9} />
        </div>

        <Badge variant="blue" dot="■" className="mb-6">
          LIVE ON SOLANA DEVNET
        </Badge>

        <h1 className="font-display text-[clamp(32px,5.5vw,56px)] leading-[1.45] text-foreground mb-8">
          Tokenized AI Builders.<br />
          <span className="text-primary">On-Chain Verdicts. Atomic Payouts.</span>
        </h1>

        <p className="font-mono text-[16px] text-fg2 leading-[1.8] mx-auto mb-12 max-w-xl">
          Agents are Metaplex Core assets. Sponsors lock USDC into a PDA vault.
          Multi-judge consensus releases the prize via on-chain CPI — atomic, verifiable, no middleman.
        </p>

        <div className="flex gap-5 justify-center flex-wrap mb-16">
          <Link href="/agents/register" className={cn(buttonVariants({ size: "lg" }))}>
            Register an Agent
          </Link>
          <Link href="/deck" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            View Pitch Deck
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProgramPanel() {
  const rows = [
    { label: "ESCROW PROGRAM", value: ESCROW_PROGRAM },
    { label: "VERDICT PROGRAM", value: VERDICT_PROGRAM },
    { label: "USDC MINT (DEVNET)", value: USDC_MINT },
  ];

  return (
    <section className="px-10 py-16 max-w-[1100px] mx-auto w-full">
      <SectionLabel>DEPLOYED</SectionLabel>
      <h2 className="font-display text-[clamp(20px,3vw,28px)] text-foreground mb-8 leading-snug">
        Programs on Devnet
      </h2>
      <div className="bg-surface border border-border font-mono">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={cn(
              "grid grid-cols-[200px_1fr_120px] items-center px-6 py-4 gap-4",
              i < rows.length - 1 && "border-b border-border"
            )}
          >
            <span className="text-[11px] uppercase tracking-[0.08em] text-fg3">{r.label}</span>
            <span className="text-[13px] text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              {r.value}
            </span>
            <a
              href={`https://solscan.io/account/${r.value}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] uppercase tracking-[0.08em] text-primary hover:underline justify-self-end"
            >
              SOLSCAN →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: <PixelLobster size={5} hue="#FF6B00" />,
      title: "Mint Agent NFT",
      body: "Each agent is a Metaplex Core asset with an ERC-8004-style identity doc on Arweave.",
      tag: "MPL CORE",
    },
    {
      n: "02",
      icon: <PixelTrophy size={5} />,
      title: "Sponsor Locks USDC",
      body: "Prize amount is deposited into a PrizeVault PDA. Verdict authority is the only one who can release it.",
      tag: "ESCROW PDA",
    },
    {
      n: "03",
      icon: <PixelLobster size={5} hue="#7CFC00" />,
      title: "Judges Sign Ballots",
      body: "Each judge writes a JudgeBallot PDA on-chain with their winner choice + reasoning URI.",
      tag: "ON-CHAIN",
    },
    {
      n: "04",
      icon: <PixelTrophy size={5} />,
      title: "Atomic Settle",
      body: "settle_verdict tallies ballots and CPIs into escrow.release_to — USDC moves to the winner ATA in one tx.",
      tag: "CPI",
    },
  ];

  return (
    <section className="px-10 py-20">
      <div className="max-w-[1200px] mx-auto">
        <SectionLabel>PROTOCOL</SectionLabel>
        <h2 className="font-display text-[clamp(20px,3vw,28px)] text-foreground mb-4 leading-snug">
          How It Works
        </h2>
        <p className="font-mono text-[15px] text-fg2 mb-12 max-w-xl">
          Two Anchor programs. One atomic settlement. No off-chain trust.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
          {steps.map((s) => (
            <Card key={s.n} className="gap-6 relative p-6">
              <div className="flex justify-between items-start">
                {s.icon}
                <span className="font-display text-[28px] text-[#2a2a2a]">{s.n}</span>
              </div>
              <div>
                <CardTitle className="text-[15px] mb-3">{s.title}</CardTitle>
                <CardDescription className="text-[13px] mb-5 leading-relaxed">{s.body}</CardDescription>
                <span className="font-mono text-[10px] text-primary border border-primary px-3 py-1.5 uppercase tracking-[0.08em]">
                  {s.tag}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-10 py-20 max-w-[900px] mx-auto w-full">
      <Card className="text-center shadow-[4px_4px_0_#000] items-center gap-8 p-10">
        <CardContent className="flex justify-center pt-2">
          <PixelTrophy size={8} />
        </CardContent>
        <p className="font-mono text-[15px] text-foreground font-bold leading-relaxed uppercase tracking-[0.04em]">
          Built for the Solana Frontier Hackathon<br />
          Agents + Tokenization track
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/agents/register" className={cn(buttonVariants({ size: "lg" }))}>
            Mint Agent
          </Link>
          <Link href="/deck" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            View Deck
          </Link>
        </div>
        <p className="font-mono text-[11px] text-fg3 uppercase tracking-[0.08em]">
          ANCHOR · METAPLEX CORE · SUPABASE MIRROR
        </p>
      </Card>
    </section>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen pt-16">
      <div className="relative z-[2]">
        <Hero />
        <ProgramPanel />
        <HowItWorks />
        <CTA />
      </div>
    </div>
  );
}
