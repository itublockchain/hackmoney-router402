# Route402

Route402 is a payment-gated API platform that enables developers to monetize API endpoints using the [x402 HTTP payment protocol](https://www.x402.org/). It combines ERC-4337 smart accounts with session keys to provide a seamless, gasless payment experience for AI model inference and other protected resources.

## What is Route402?

Route402 provides:

- **Payment-Gated APIs** -- Protect any API endpoint behind a paywall using the HTTP 402 status code and x402 payment protocol.
- **Smart Account Abstraction** -- Users interact through Kernel v3.1 smart accounts powered by ZeroDev, with gas fees sponsored by Pimlico.
- **Session Keys** -- Delegated signing keys that allow your backend to execute transactions on behalf of users without holding their private keys.
- **OpenRouter-Compatible Chat API** -- A drop-in replacement for OpenAI-style chat completion endpoints, with built-in usage tracking and billing.

## Key Concepts

### x402 Payment Protocol

The x402 protocol adds a payment layer to HTTP. When a client requests a protected resource, the server responds with `402 Payment Required` along with payment requirements. The client submits payment and retries the request with proof of payment.

### ERC-4337 Account Abstraction

Route402 uses the ERC-4337 standard to create smart contract wallets for users. These wallets are deterministic (same EOA always maps to the same smart account address), support batched transactions, and can have gas fees sponsored by a paymaster.

### Session Keys

Session keys are temporary signing keys that can execute transactions on behalf of a smart account. They are constrained by on-chain policies (time limits, allowed callers) and allow backends to process payments without requiring the user's wallet to sign every transaction.

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Client     │────▶│  Route402    │────▶│                 │
│  (Browser/   │     │  Server      │     │   LLM Provider  │
│   Extension) │     │              │     │                 │
└──────┬───────┘     └──────┬───────┘     └─────────────────┘
       │                    │
       │  EIP-712 Auth      │  Session Key Txs
       │                    │
┌──────▼───────┐     ┌──────▼───────┐
│  Router402   │     │  Pimlico     │
│  SDK         │     │  Bundler &   │
│  (@router402 │     │  Paymaster   │
│   /sdk)      │     │              │
└──────────────┘     └──────────────┘
```

## Quick Links

| Section | Description |
|---------|-------------|
| [Getting Started](sdk/getting-started.md) | Install the SDK and set up your first smart account |
| [API Reference](api-reference/) | Complete REST API endpoint documentation |
| [SDK Reference](sdk/) | Router402Sdk class methods and types |
| [Guides](guides/) | In-depth technical guides and walkthroughs |
