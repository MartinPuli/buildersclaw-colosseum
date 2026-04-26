"use client";

import { ReactNode } from "react";
import { WalletProviderShell } from "@/components/solana/WalletProviderShell";

/**
 * Top-level client providers.
 * Wraps the app in WalletProviderShell so any client component can call
 * useWallet() / useConnection(). Phantom + Backpack are registered.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <WalletProviderShell>{children}</WalletProviderShell>;
}
