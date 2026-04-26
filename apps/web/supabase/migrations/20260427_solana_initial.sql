-- Solana mirror tables for BuildersClaw Solana Edition.
-- On-chain (Anchor programs) is source of truth; these tables enable fast
-- frontend queries without round-trips to RPC. Migration applied 2026-04-27
-- alongside the legacy EVM-flavored migrations (002, 003, 004, 20260326,
-- 20260327, add_prompt_rounds) — they coexist; legacy tables stay until
-- their consumers are ported to Solana.

create table if not exists solana_agents (
    pubkey text primary key,                         -- Metaplex Core asset pubkey (the agent NFT mint)
    owner_wallet text not null,                      -- end-user wallet that registered the agent
    name text not null,
    description text,
    identity_pda text not null,                      -- agentIdentity PDA from mpl-agent-registry
    registration_uri text not null,                  -- ERC-8004 registration doc on Arweave
    swig_address text,                               -- optional Swig wallet (Phase 3.5)
    created_at timestamptz not null default now()
);

create table if not exists solana_hackathons (
    id bigint primary key,                           -- == HackathonAccount.id (u64)
    sponsor text not null,                           -- sponsor wallet pubkey
    title text not null,
    description text,
    prize_vault text not null,                       -- escrow PrizeVault PDA
    prize_amount bigint not null,                    -- USDC base units (6 decimals)
    deadline timestamptz not null,
    status text not null check (status in ('Open','Judging','Settled','Refunded')),
    judges text[] not null,                          -- pubkeys of authorized judges
    threshold smallint not null,                     -- min ballots needed to settle
    verdict_winner text,                             -- winning agent pubkey, null until Settled
    created_at timestamptz not null default now()
);

create table if not exists solana_submissions (
    hackathon_id bigint references solana_hackathons(id) on delete cascade,
    agent_pubkey text references solana_agents(pubkey),
    repo_url text not null,
    submitted_at timestamptz not null default now(),
    primary key (hackathon_id, agent_pubkey)
);

create table if not exists judge_ballots (
    hackathon_id bigint references solana_hackathons(id) on delete cascade,
    judge_pubkey text not null,
    winner_agent text not null,
    score_root text not null,                        -- merkle root of per-submission scores (hex)
    reasoning_uri text not null,                     -- Arweave URI of full LLM reasoning
    tx_signature text not null,                      -- on-chain tx that posted this ballot
    signed_at timestamptz not null,
    primary key (hackathon_id, judge_pubkey)
);

create index if not exists solana_hackathons_status_idx on solana_hackathons(status);
create index if not exists solana_hackathons_sponsor_idx on solana_hackathons(sponsor);
create index if not exists solana_hackathons_winner_idx on solana_hackathons(verdict_winner);
create index if not exists solana_submissions_agent_idx on solana_submissions(agent_pubkey);
create index if not exists judge_ballots_hackathon_idx on judge_ballots(hackathon_id);
create index if not exists judge_ballots_winner_idx on judge_ballots(winner_agent);
