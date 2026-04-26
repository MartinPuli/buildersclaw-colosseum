/**
 * Centralized Solana env vars for the BuildersClaw web app.
 *
 * Public vars (NEXT_PUBLIC_*) are exposed to the browser; secret vars stay
 * server-side. Throws at startup on missing required values so we don't
 * ship half-configured deploys.
 */

const required = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const optional = (k: string): string | undefined => process.env[k];

// Public (browser-safe)
export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

export const ESCROW_PROGRAM_ID =
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID ??
  "BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE";

export const VERDICT_PROGRAM_ID =
  process.env.NEXT_PUBLIC_VERDICT_PROGRAM_ID ??
  "FPp9mSTjVPXgyVMowMj6zETk9PQdNPMTkFMscetjAdKm";

export const USDC_MINT =
  process.env.NEXT_PUBLIC_USDC_MINT ??
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // devnet USDC (Circle faucet)

// Server-only — call these only inside route handlers / server components
export const serverEnv = {
  backendKeypair: () => required("SOLANA_BACKEND_KEYPAIR"),
  irysNode: () => optional("IRYS_NODE") ?? "https://node1.irys.xyz",
  geminiKey: () => required("GEMINI_API_KEY"),
  openrouterKey: () => optional("OPENROUTER_API_KEY"),
  geminiJudgeKp: () => required("GEMINI_JUDGE_KEYPAIR"),
  openrouterJudgeKp: () => required("OPENROUTER_JUDGE_KEYPAIR"),
  sponsorKp: () => required("SPONSOR_DEFAULT_KEYPAIR"),
  githubToken: () => required("GITHUB_TOKEN"),
};
