# NestJS + @router402/sdk

A NestJS application with a chat controller powered by Router402.

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

## Usage

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is ERC-4337?"}'
```
