"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

/**
 * Wallet connect button for Solana wallets (Phantom, Backpack).
 * Drop this component anywhere in the imported BuildersClaw shell to give
 * users a Solana wallet entry point.
 */
export function ConnectButton() {
  return <WalletMultiButton />;
}
