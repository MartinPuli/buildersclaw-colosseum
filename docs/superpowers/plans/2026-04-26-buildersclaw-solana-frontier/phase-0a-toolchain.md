# Phase 0a — Toolchain + repo + Anchor workspace (Day 1, ~3h)

> Phase 0 split into 0a (toolchain + repo + Anchor) and 0b (import shell + npm workspaces + env + Supabase). Continue to `phase-0b-import.md` after.

## Task 0.1: Verify toolchain installed

**Files:** none

- [ ] **Step 1: Verify Solana CLI** — `solana --version` (expect ≥ 1.18.x). Install if missing: `sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"` or Windows installer at https://docs.anza.xyz/cli/install.
- [ ] **Step 2: Verify Anchor** — `anchor --version` (expect ≥ 0.30.1). Install: `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 0.30.1 && avm use 0.30.1`.
- [ ] **Step 3: Verify Rust + Node** — `rustc --version && cargo --version && node --version` (Rust ≥ 1.75, Node ≥ 20).
- [ ] **Step 4: Devnet keypair + airdrop**

```bash
solana-keygen new --outfile ~/.config/solana/devnet.json --no-bip39-passphrase
solana config set --keypair ~/.config/solana/devnet.json --url https://api.devnet.solana.com
solana airdrop 5
solana balance
```

Expected: ≥ 4 SOL.

## Task 0.2: Create the new repo

```bash
cd c:/Users/marti/Documents
mkdir buildersclaw-solana
cd buildersclaw-solana
git init
printf 'node_modules/\ntarget/\n.anchor/\n.env\n.env.local\n.next/\ndist/\n*.log\n.DS_Store\n' > .gitignore
git add .gitignore
git commit -m "chore: initial repo scaffold"
gh repo create buildersclaw-solana --public --source=. --remote=origin --description "BuildersClaw Solana Edition"
git push -u origin main
```

## Task 0.3: Init Anchor workspace

- [ ] **Step 1: Init**

```bash
cd c:/Users/marti/Documents/buildersclaw-solana
anchor init . --no-install --no-git
mv programs/buildersclaw_solana programs/escrow
rm -rf app
anchor new verdict
```

- [ ] **Step 2: `Anchor.toml`** — overwrite with:

```toml
[toolchain]
anchor_version = "0.30.1"

[features]
resolution = true
skip-lint = false

[programs.localnet]
escrow = "EscRoWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
verdict = "VerDicTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[programs.devnet]
escrow = "EscRoWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
verdict = "VerDicTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/devnet.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.spec.ts"
```

- [ ] **Step 3: `Cargo.toml`**

```toml
[workspace]
members = ["programs/escrow", "programs/verdict"]
resolver = "2"

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1
```

- [ ] **Step 4: Generate keypairs + replace IDs**

```bash
mkdir -p target/deploy
solana-keygen new --outfile target/deploy/escrow-keypair.json --no-bip39-passphrase
solana-keygen new --outfile target/deploy/verdict-keypair.json --no-bip39-passphrase
ESCROW_ID=$(solana-keygen pubkey target/deploy/escrow-keypair.json)
VERDICT_ID=$(solana-keygen pubkey target/deploy/verdict-keypair.json)
echo "escrow=$ESCROW_ID  verdict=$VERDICT_ID"
```

Replace placeholder IDs in `Anchor.toml` and `declare_id!(...)` in each `programs/*/src/lib.rs`.

- [ ] **Step 5: Build + commit**

```bash
anchor build
git add Anchor.toml Cargo.toml programs/ target/deploy/*.json
git commit -m "chore: anchor workspace with escrow + verdict program scaffolds"
```
