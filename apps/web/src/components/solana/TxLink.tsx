"use client";

/**
 * Solscan link for a Solana transaction signature.
 * Defaults to devnet — change cluster query when promoting to mainnet.
 */
export function TxLink({
  sig,
  label,
  cluster = "devnet",
}: {
  sig: string;
  label?: string;
  cluster?: "devnet" | "mainnet" | "testnet";
}) {
  const url =
    cluster === "mainnet"
      ? `https://solscan.io/tx/${sig}`
      : `https://solscan.io/tx/${sig}?cluster=${cluster}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-sm text-emerald-400 underline break-all"
    >
      {label ?? `${sig.slice(0, 8)}…${sig.slice(-8)}`}
    </a>
  );
}
