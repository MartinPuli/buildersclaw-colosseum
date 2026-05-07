import { Keypair } from "@solana/web3.js";
import * as fs from "node:fs";

/**
 * Load a Solana Keypair from either:
 *   - a file path (local dev with `~/.config/solana/devnet.json`), OR
 *   - a JSON array string (production env var on Vercel where there's
 *     no persistent filesystem). e.g. SOLANA_BACKEND_KEYPAIR_JSON='[1,2,...]'
 *
 * Tries the JSON-array env var first if provided, then falls back to the
 * file path. Throws a clear error if neither yields a valid keypair.
 */
export function loadKeypair(opts: {
  pathEnvVar: string;
  jsonEnvVar: string;
  label: string;
}): Keypair {
  const jsonInline = process.env[opts.jsonEnvVar];
  if (jsonInline && jsonInline.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(jsonInline) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch (e) {
      throw new Error(
        `${opts.label}: ${opts.jsonEnvVar} is set but not valid JSON array: ${
          (e as Error).message
        }`
      );
    }
  }

  const path = process.env[opts.pathEnvVar];
  if (path) {
    try {
      const secret = JSON.parse(fs.readFileSync(path, "utf-8"));
      return Keypair.fromSecretKey(Uint8Array.from(secret));
    } catch (e) {
      throw new Error(
        `${opts.label}: failed to load from ${path}: ${(e as Error).message}`
      );
    }
  }

  throw new Error(
    `${opts.label}: neither ${opts.jsonEnvVar} (JSON array) nor ${opts.pathEnvVar} (file path) is set`
  );
}

/** Backend signer for sponsor / settle / register-agent operations. */
export function loadBackendKeypair(): Keypair {
  return loadKeypair({
    pathEnvVar: "SOLANA_BACKEND_KEYPAIR",
    jsonEnvVar: "SOLANA_BACKEND_KEYPAIR_JSON",
    label: "backend keypair",
  });
}

/** Sponsor manual judge signer. */
export function loadSponsorKeypair(): Keypair {
  return loadKeypair({
    pathEnvVar: "SPONSOR_DEFAULT_KEYPAIR",
    jsonEnvVar: "SPONSOR_DEFAULT_KEYPAIR_JSON",
    label: "sponsor keypair",
  });
}
