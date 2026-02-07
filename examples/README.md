# @router402/sdk Examples

Example projects demonstrating how to use the [`@router402/sdk`](https://www.npmjs.com/package/@router402/sdk) package with popular frameworks.

## Examples

| Example | Framework | Description |
| ------- | --------- | ----------- |
| [express](./express) | Express.js | Minimal REST API with a `/chat` endpoint |
| [nestjs](./nestjs) | NestJS | Modular NestJS app with a chat controller |
| [nextjs](./nextjs) | Next.js | App Router API route + simple chat UI |

## Prerequisites

- Node.js 18+
- A Router402 JWT token (get one at [router402.xyz](https://www.router402.xyz))

## Quick Start

Each example is a standalone project. Pick one and run:

```bash
cd examples/<framework>
npm install
```

Create a `.env` file with your token:

```
ROUTER402_TOKEN=your_jwt_token_here
```

Then start the dev server:

```bash
npm run dev
```

## How It Works

All examples follow the same pattern:

1. Import and instantiate `Router402Sdk` with your JWT token
2. Call `sdk.chat(prompt)` to get an AI response through Router402
3. Return the response to the client

Refer to the [SDK documentation](https://www.npmjs.com/package/@router402/sdk) for the full API reference.
