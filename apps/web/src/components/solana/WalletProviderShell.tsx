"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  BackpackWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Wraps Solana wallet connection state for the BuildersClaw Solana edition.
 *
 * Mounts at the top of the app via apps/web/src/app/layout.tsx so any client
 * component can call useWallet() / useConnection().
 *
 * RPC endpoint comes from NEXT_PUBLIC_SOLANA_RPC_URL (devnet default).
 */
export function WalletProviderShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new BackpackWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
