# LI.FI — Cross-Chain Routing for Agents

**Role in the stack:** cross-chain execution layer. 27+ bridges, 31+ DEXs, 58 chains.

## Two products in this track

1. **MCP Server** — read-only routing tools for AI coding agents (Claude/Cursor/Windsurf/VS Code)
2. **Agent Skills** — `npx skills add` knowledge packs for `@lifi/sdk` and the LI.FI REST API

## MCP Server

> Read-only — does **not** sign or broadcast. You sign the unsigned tx it returns.

### Install (claude/cursor mcp config)

```json
{
  "mcpServers": {
    "lifi": {
      "type": "http",
      "url": "https://mcp.li.quest/mcp"
    }
  }
}
```

### Tools exposed

| Tool | Purpose |
|---|---|
| `get-chains` | discover chain IDs and RPCs |
| `get-token` | resolve token address by chain + symbol |
| `get-quote` | optimal route + unsigned transaction request |
| `get-allowance` | ERC20-style approval status |
| `get-status` | monitor in-flight cross-chain tx |
| `test-api-key` | validate API key + rate limits |

### Solana specifics

- Chain ID: `1151111081099710`
- Native SOL: `11111111111111111111111111111111`
- wSOL: `So11111111111111111111111111111111111111112`
- Bridges: **Mayan** (Swift / CCTP / Wormhole), **AllBridge** (USDC/USDT)
- DEX: **Jupiter** (verified tokens only)
- Limitation: only single-step transactions per ecosystem; two-step cross-ecosystem in development

### Typical flow

`get-chains` → `get-token` → `get-quote` → sign + broadcast externally → `get-status` to confirm.

## Agent Skills (knowledge packs)

```bash
npx skills add <owner>/lifi-agent-skills            # full set
npx skills add <owner>/lifi-agent-skills/li-fi-sdk  # @lifi/sdk only
npx skills add <owner>/lifi-agent-skills/li-fi-api  # REST API only
```

Use the SDK skill in TS/JS frontends or Node services; use the API skill for backends in any language.

## Links

- Docs root: https://docs.li.fi/
- Solana overview: https://docs.li.fi/li.fi-api/solana
- REST API reference: https://docs.li.fi/api-reference/introduction
- MCP server overview: https://docs.li.fi/mcp-server/overview
- Agent skills repo: https://github.com/lifinance/lifi-agent-skills

## When to pick

- Agent needs to **rebalance/bridge** between Solana and EVM (USDC reserve management is the canonical case)
- You want LLM tool-use to be **stateless and read-only** (route discovery only, no key custody risk)
- Backend needs Jupiter under the hood without writing the integration
