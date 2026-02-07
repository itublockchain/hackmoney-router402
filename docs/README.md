# Router402 - Use any LLM with x402 micropayments. One API, multiple models, pay-per-use.

<p align="center">
    <img src="../apps/web/public/banner.gif" alt="Banner" width="100%" />
</p>

## The Problem

There is no true pay-per-use option for LLMs today.

Subscription plans lock flagship models behind expensive tiers or impose hourly rate limits. Services that brand themselves as "pay as you go" — like OpenRouter — are actually **prepaid**: you deposit money upfront, they hold it, and deduct from your balance. Your funds leave your control the moment you top up.

Every existing payment model asks users to **trust a third party with their money before receiving any value**. Whether it's a $20/month subscription or a $5 prepaid deposit, you're always paying ahead for usage that hasn't happened yet.

## The Solution

**Router402** is an OpenRouter-compatible AI gateway with real microtransaction-based billing. Every API call settles the cost of your **previous request** as a USDC micropayment on Base via the [x402 protocol](https://www.x402.org/). Your money stays in your smart account until a completed request is being paid for — you never pay for something that hasn't happened yet.

No prepaid balances. No subscriptions. No custody. **True pay-per-use.**

<p align="center">
  <img src="../apps/web/public/demo/demo-web.gif" alt="Router402 Demo" width="700" />
</p>

## How It Works

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as Router402 Gateway
    participant Base as Base Network (USDC)
    participant LLM as Claude / Gemini

    Client->>Gateway: Request N + x402 payment header
    Gateway->>Base: Settle cost of Request N-1 (~0.2s via Flashblocks)
    Base-->>Gateway: Settlement confirmed ✓
    Gateway->>LLM: Forward Request N
    LLM-->>Gateway: Stream response
    Gateway-->>Client: Stream response
    Note over Client,Base: Each request pays for the previous one.<br/>Settlement must confirm before the LLM call is forwarded.
```

1. **Client** sends a chat completion request with an x402 payment header.
2. **Gateway** settles the cost of your **previous request** as a USDC micropayment on Base via Flashblocks (~0.2s).
3. **LLM provider** (Claude or Gemini) processes the current request.
4. **Response** streams back. The cost of this request will be settled with your next call.

The payment model is simple: **every request pays for the one before it.** This means the gateway always knows the exact token cost before settling — no estimates, no overcharges. Your first request is free to settle (there's no previous cost), and your funds never leave your smart account until a completed request is being paid for.

## Key Features

**💸 True Micropayments** — Not prepaid. Not subscription. Every API call settles an individual USDC microtransaction on Base via x402. Your money stays yours until the moment you use it.

**⚡ 0.2s Settlement via Flashblocks** — We modified the OpenFacilitator to leverage Base Flashblocks for ~200ms settlement finality. The previous request's cost settles on-chain before the next LLM call is forwarded — fast enough to feel seamless.

**🔌 One API, Multiple Models** — Access Claude and Gemini through a single OpenRouter-compatible endpoint. Switch models by changing one string — no new accounts, no new billing.

**🔑 Smart Accounts** — Pimlico-powered account abstraction with session keys. Gasless transactions, no wallet popups mid-conversation, and no seed phrases to manage.

**🎯 Exact-Cost Settlement** — Every request pays for the previous one, so the gateway always settles the real token cost — never an estimate. No overcharges, no disputes, no refund requests.

**🔧 Drop-in Compatible** — Already using OpenRouter? Point your existing tools at Router402. Same API shape, same model strings — new payment rail where you keep control of your money.

**🌉 Li.Fi MCP Integration** — Built-in MCP server that returns typed transaction data from Li.Fi. Users can bridge and swap assets directly from their own wallet — no private key handoff, no custody risk. The gateway returns the unsigned transaction; you sign it yourself.

## Why Not Just Use OpenRouter?

| | Subscriptions (ChatGPT, Claude Pro) | Prepaid (OpenRouter) | **Router402** |
|---|---|---|---|
| **When you pay** | Before use (monthly) | Before use (deposit) | **After use (previous request)** |
| **Who holds your money** | Provider | Provider | **You** (smart account) |
| **Settlement speed** | N/A (monthly billing) | Internal ledger | **~0.2s on-chain (Flashblocks)** |
| **Minimum commitment** | $20/month | $5+ top-up | **$0 — any amount** |
| **If service goes down** | Money lost for the month | Balance stuck with provider | **Nothing to lose** |
| **Flagship model access** | High tiers only | Available | **Available** |
| **Rate limits** | Hourly caps | Token-based | **None — pay more, use more** |
| **Refund if unused** | No | Manual request | **Automatic — you never overpay** |

## Quick Start

### Option 1: Demo Client (Fastest)

```bash
# Visit the demo app
open https://router402.xyz

# 1. Create a smart account (one click, powered by Pimlico)
# 2. Deposit USDC into YOUR smart account (you retain full custody)
# 3. Start chatting — each message pays for the previous one
# 4. Access your API key to use Router402 from any client
```

### Option 2: TypeScript SDK

```bash
npm install @router402/sdk
```

```typescript
import { Router402 } from '@router402/sdk';

const ai = new Router402({ apiKey: 'your-api-key' });

const response = await ai.chat({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [{ role: 'user', content: 'Explain x402 in one sentence.' }]
});

console.log(response.choices[0].message.content);
// This request's cost will be settled via Flashblocks (~0.2s) with your next call
// Your funds stay in your smart account until then
```

### Option 3: VS Code Extension

```
1. Install "Router402" from the VS Code Marketplace -> https://marketplace.visualstudio.com/items?itemName=router402xyz.router402-vscode
2. Add your API key in Settings → Router402
3. Cmd+Shift+P → "Router402: Chat" — prompt from your editor
```

### Option 4: cURL (Raw HTTP)

```bash
curl -X POST https://api.router402.xyz/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-3-flash",
    "messages": [{"role": "user", "content": "Hello from cURL!"}]
  }'
```

## Architecture

```mermaid
graph TD
    subgraph Clients
        A[Demo Web App]
        B[TypeScript SDK]
        C[VS Code Extension]
        D[cURL / Any HTTP]
    end

    subgraph Gateway["Router402 Gateway"]
        E[Express · TypeScript · Prisma]
        F[Anthropic — Claude]
        G[Google — Gemini]
        K[Li.Fi MCP Server]
    end

    subgraph Infrastructure
        H[Pimlico — Account Abstraction]
        I[Base Network — USDC]
        J[OpenFacilitator — Flashblocks ⚡ 0.2s]
        L[Li.Fi — Bridge & Swap]
    end

    A --> E
    B --> E
    C --> E
    D --> E
    E --> F
    E --> G
    E --> H
    E --> I
    E --> J
    K --> L
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Gateway** | Express, TypeScript, Prisma, Neon (Postgres) |
| **Blockchain** | Base L2 (Flashblocks), Viem, USDC |
| **Account Abstraction** | Pimlico, Smart Accounts, Session Keys |
| **Payments** | x402 Protocol, Modified OpenFacilitator (Base Flashblocks, ~0.2s settlement) |
| **LLM Providers** | Anthropic (Claude), Google (Gemini) |
| **Auth** | JWT with session-key-based identity |
| **MCP** | Li.Fi MCP Server (bridge & swap, returns typed tx data) |
| **Clients** | React / Next.js (demo), VS Code Extension API, TypeScript SDK |

## Project Structure

```
hackmoney-router402/
├── apps/
│   ├── contracts/          # Solidity smart contracts (Foundry)
│   ├── extension/          # VS Code extension
│   ├── facilitator/        # Modified OpenFacilitator (Base Flashblocks)
│   ├── mcp/                # Li.Fi MCP Server (Cloudflare Workers)
│   ├── server/             # Backend API server (Express + Prisma)
│   └── web/                # Frontend web app (Next.js)
├── packages/
│   ├── sdk/                # TypeScript SDK — @router402/sdk
│   ├── types/              # Shared types — @router402/types
│   └── utils/              # Shared utilities — @router402/utils
├── docs/                   # GitBook documentation
├── turbo.json              # Turborepo config
└── package.json            # Bun workspaces monorepo root
```

## Local Development

### Prerequisites

- [Bun](https://bun.sh/) v1.3.8+
- [Node.js](https://nodejs.org/) v20+
- PostgreSQL database (e.g. [Neon](https://neon.tech/))

### 1. Clone & Install

```bash
git clone https://github.com/itublockchain/hackmoney-router402.git
cd hackmoney-router402

# Install all workspace dependencies from root
bun install
```

### 2. Configure the server

```bash
cd apps/server
cp .env.example .env
```

Fill in your `.env`:

```env
# Required
DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb
JWT_SECRET=at-least-32-characters-long-secret
PIMLICO_API_KEY=your_pimlico_key

# Optional (defaults provided)
PORT=8080
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
RPC_URL=https://mainnet.base.org/
PAY_TO=0x...
FACILITATOR_URL=https://x402.org/facilitator
```

### 3. Run database migrations

```bash
cd apps/server
bunx prisma migrate dev
```

### 4. Configure the web frontend

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_id

# Optional (defaults provided)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_key
NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_zerodev_id
```

### 5. Start development servers

```bash
# From root — Turborepo starts both server and web
bun run dev
```

This spins up:
- **Server (API):** `http://localhost:8080`
- **Web (Frontend):** `http://localhost:3000`

### Useful Commands

```bash
bun run build          # Build all workspaces
bun run lint           # Lint with Biome
bun run typecheck      # TypeScript type checking
bun run test           # Run tests
bun run format         # Format code
bun run build:server   # Build server only (includes sdk, types, utils)

# Prisma Studio (database GUI)
cd apps/server && bunx prisma studio
```

## Roadmap

- [x] Gateway API with OpenRouter-compatible interface
- [x] x402 micropayment integration on Base
- [x] Modified OpenFacilitator with Base Flashblocks (~0.2s settlement)
- [x] Smart account creation with Pimlico
- [x] Claude and Gemini support
- [x] TypeScript SDK
- [x] VS Code Extension
- [x] Demo web client
- [x] Li.Fi MCP server (bridge & swap with typed transaction data)
- [ ] More LLM providers (Llama, Mistral, GPT)
- [ ] Usage analytics dashboard
- [ ] Multi-chain support (Optimism, Arbitrum, Solana)
- [ ] Staking rewards for frequent users

## Useful Links
- [Web App](https://www.router402.xyz/)
- [Docs](https://docs.router402.xyz/) 
- [Facilitator Dashboard](https://opendashboard.router402.xyz/) 
- [Facilitator Server](https://x402.router402.xyz/supported)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=router402xyz.router402-vscode)
- [LI.FI MCP](https://mcp-cloudflare.omerfurkanyuruk1.workers.dev/mcp)
- [Stake Contract](https://sepolia.basescan.org/address/0xA5B97115FDE7E4d91E533ba6B299A1a4C53a167E#code)

## Team

- [Farhad Asgarov](https://x.com/asgarovf)
- [Eylül Şahin](https://x.com/eylulsdesign) 
- [Ömer Furkan Yürük](https://x.com/oemerfurkan) 
- [Utku Ömer Kılıç](https://x.com/utmrklc) 
- [Feyyaz Numan Cavlak](https://x.com/feyyazcigim)

Built by [ITU Blockchain](https://x.com/ITUBlockchainen) at HackMoney 2025.
