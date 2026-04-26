# Phase 3b — Genesis + Swig + Anchor clients (Day 8, ~6h)

> Continues from `phase-3a-metaplex-wrappers.md`.

## Task 3.4: Genesis launch wrapper

**Files:** `packages/solana-integration/src/genesisLaunch.ts`

```typescript
import { Umi, PublicKey, publicKey } from "@metaplex-foundation/umi";
import { createAndRegisterLaunch } from "@metaplex-foundation/mpl-genesis";

export interface LaunchAgentTokenParams {
  agentAsset: string | PublicKey;
  name: string; symbol: string; image: string;
  firstBuyAmount?: number;
}
export interface LaunchedToken { mint: string; launchAddress: string; }

export async function launchAgentToken(umi: Umi, params: LaunchAgentTokenParams): Promise<LaunchedToken> {
  const result = await createAndRegisterLaunch(umi, {}, {
    wallet: umi.identity.publicKey,
    agent: {
      mint: typeof params.agentAsset === "string" ? publicKey(params.agentAsset) : params.agentAsset,
      setToken: true,
    },
    launchType: "bondingCurve",
    token: { name: params.name, symbol: params.symbol, image: params.image },
    ...(params.firstBuyAmount ? { launch: { firstBuyAmount: params.firstBuyAmount } } : {}),
  });
  return {
    mint: (result as any).tokenMint?.toString() ?? (result as any).mint?.toString(),
    launchAddress: (result as any).launchAddress?.toString(),
  };
}
```

> The Genesis SDK return shape isn't stable in docs — this wrapper normalizes. Test against the actual SDK in dev; adjust property names if needed. Plan B: ask in the Apr 28 Metaplex workshop on Discord.

`src/index.ts` add: `export { launchAgentToken, type LaunchAgentTokenParams, type LaunchedToken } from "./genesisLaunch.js";`

```bash
cd packages/solana-integration && npm run build && cd ../..
git add packages/solana-integration
git commit -m "feat(integration): launchAgentToken via Genesis bonding curve"
```

## Task 3.5: Swig wallet wrapper (stub)

**Files:** `packages/solana-integration/src/swigWallet.ts`

> Swig's published npm name is unstable. Before writing, check `https://github.com/anagrambuild/swig-ts/packages` for actual published name. Candidates: `@anagrambuild/swig-classic`, `@anagrambuild/swig-kit`. Once confirmed, install and replace the stub.

```typescript
import { Keypair, PublicKey } from "@solana/web3.js";

export interface CreateAgentSwigParams { owner: PublicKey; rpcUrl: string; payer: Keypair; }
export interface AgentSwig { swigAddress: string; roles: string[]; }

export async function createAgentSwig(_params: CreateAgentSwigParams): Promise<AgentSwig> {
  throw new Error(
    "Swig SDK package name unconfirmed. Resolve before calling. " +
    "Check https://github.com/anagrambuild/swig-ts/packages for the published name " +
    "(candidates: @anagrambuild/swig-classic, @anagrambuild/swig-kit), then implement here."
  );
}
```

> v1 demo can ship without Swig — agents use raw keypairs. Pitch still works because Metaplex Registry + Genesis are core.

`src/index.ts` add: `export { createAgentSwig, type CreateAgentSwigParams, type AgentSwig } from "./swigWallet.js";`

```bash
cd packages/solana-integration && npm run build && cd ../..
git add packages/solana-integration
git commit -m "feat(integration): swig wallet stub (resolve pkg name before use)"
```

## Task 3.6: Anchor program clients (Escrow + Verdict)

**Files:** `packages/solana-integration/src/idl/{escrow.json,escrow.ts,verdict.json,verdict.ts}`, `src/escrow.ts`, `src/verdictClient.ts`

- [ ] **Step 1: Copy IDLs**

```bash
mkdir -p packages/solana-integration/src/idl
cp target/idl/escrow.json packages/solana-integration/src/idl/escrow.json
cp target/idl/verdict.json packages/solana-integration/src/idl/verdict.json
cp target/types/escrow.ts packages/solana-integration/src/idl/escrow.ts
cp target/types/verdict.ts packages/solana-integration/src/idl/verdict.ts
```

- [ ] **Step 2: EscrowClient**

```typescript
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import escrowIdl from "./idl/escrow.json";
import { Escrow } from "./idl/escrow.js";

export interface EscrowDepositParams {
  hackathonId: bigint; amount: bigint; mint: PublicKey;
  depositorAta: PublicKey; verdictAuthority: PublicKey;
}

export class EscrowClient {
  readonly program: Program<Escrow>;
  constructor(connection: Connection, payer: Keypair) {
    const wallet = new anchor.Wallet(payer);
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    this.program = new Program<Escrow>(escrowIdl as any, provider);
  }
  vaultPda(id: bigint): [PublicKey, number] {
    const bn = new anchor.BN(id.toString());
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), bn.toArrayLike(Buffer, "le", 8)], this.program.programId);
  }
  vaultAtaPda(vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vault.toBuffer()], this.program.programId);
  }
  async deposit(p: EscrowDepositParams): Promise<string> {
    const [vault] = this.vaultPda(p.hackathonId);
    const [vaultAta] = this.vaultAtaPda(vault);
    return this.program.methods.deposit(
      new anchor.BN(p.hackathonId.toString()),
      new anchor.BN(p.amount.toString())
    ).accounts({
      depositor: this.program.provider.publicKey!,
      vault, mint: p.mint, depositorAta: p.depositorAta, vaultAta,
      verdictAuthority: p.verdictAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();
  }
}
```

- [ ] **Step 3: VerdictClient**

```typescript
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import verdictIdl from "./idl/verdict.json";
import { Verdict } from "./idl/verdict.js";

export class VerdictClient {
  readonly program: Program<Verdict>;
  constructor(connection: Connection, payer: Keypair) {
    const wallet = new anchor.Wallet(payer);
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    this.program = new Program<Verdict>(verdictIdl as any, provider);
  }
  hackathonPda(id: bigint): [PublicKey, number] {
    const bn = new anchor.BN(id.toString());
    return PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), bn.toArrayLike(Buffer, "le", 8)], this.program.programId);
  }
  ballotPda(hackathon: PublicKey, judge: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("ballot"), hackathon.toBuffer(), judge.toBuffer()], this.program.programId);
  }
  verdictAuthorityPda(hackathon: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("verdict_authority"), hackathon.toBuffer()], this.program.programId);
  }
  async initHackathon(o: {
    id: bigint; judges: PublicKey[]; threshold: number;
    deadline: number; prizeVault: PublicKey;
  }): Promise<string> {
    const [hackathon] = this.hackathonPda(o.id);
    return this.program.methods.initHackathon(
      new anchor.BN(o.id.toString()), o.judges, o.threshold, new anchor.BN(o.deadline)
    ).accounts({
      sponsor: this.program.provider.publicKey!,
      hackathon, prizeVault: o.prizeVault,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
  }
  async submitBallot(o: {
    hackathonId: bigint; judge: Keypair; winnerAgent: PublicKey;
    scoreRoot: number[]; reasoningUri: string;
  }): Promise<string> {
    const [hackathon] = this.hackathonPda(o.hackathonId);
    const [ballot] = this.ballotPda(hackathon, o.judge.publicKey);
    return this.program.methods.submitBallot(o.winnerAgent, o.scoreRoot as any, o.reasoningUri)
      .accounts({ judge: o.judge.publicKey, hackathon, ballot,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([o.judge]).rpc();
  }
  async settleVerdict(o: {
    hackathonId: bigint; prizeVault: PublicKey; vaultAta: PublicKey; winnerAta: PublicKey;
    escrowProgramId: PublicKey; ballotPdas: PublicKey[];
  }): Promise<string> {
    const [hackathon] = this.hackathonPda(o.hackathonId);
    const [verdictAuthority] = this.verdictAuthorityPda(hackathon);
    return this.program.methods.settleVerdict().accounts({
      caller: this.program.provider.publicKey!,
      hackathon, verdictAuthority,
      prizeVault: o.prizeVault, vaultAta: o.vaultAta, winnerAta: o.winnerAta,
      escrowProgram: o.escrowProgramId, tokenProgram: TOKEN_PROGRAM_ID,
    }).remainingAccounts(o.ballotPdas.map(p => ({ pubkey: p, isSigner: false, isWritable: false }))).rpc();
  }
}
```

- [ ] **Step 4: Re-export + commit**

`src/index.ts` add:
```typescript
export { EscrowClient } from "./escrow.js";
export { VerdictClient } from "./verdictClient.js";
```

```bash
cd packages/solana-integration && npm run build && cd ../..
git add packages/solana-integration
git commit -m "feat(integration): EscrowClient and VerdictClient wrapping IDLs"
```
