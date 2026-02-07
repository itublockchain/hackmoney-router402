# Next.js + @router402/sdk

A Next.js app with an API route and simple chat UI powered by Router402.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and add your ROUTER402_TOKEN
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the chat UI, or call the API directly:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is ERC-4337?"}'
```
