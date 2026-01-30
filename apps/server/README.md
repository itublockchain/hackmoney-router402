# Router 402 Server

Express.js backend with TypeScript and source-to-source local package integration.

## Quick Start

```bash
# Install dependencies (from root)
bun install

# Create .env file
cp .env.example .env

# Start development server
bun run dev
```

The server will start on `http://localhost:3001`.

## Available Scripts

- `dev` - Start development server with hot reload
- `build` - Build TypeScript to JavaScript
- `start` - Run production server (requires build first)
- `typecheck` - Run TypeScript type checking
- `lint` - Run Biome linter

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Frontend origin for CORS (default: http://localhost:3000)

## Endpoints

### Health Check
```
GET /health
```

Returns server status, uptime, and version.

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T...",
  "uptime": 42,
  "version": "0.1.0"
}
```

## Architecture

### Local Package Integration

The server imports shared packages directly from source:

```typescript
import { getEnvVar } from "@router402/utils";
import type { HealthResponse } from "@router402/types";
```

TypeScript path mappings in `tsconfig.json` resolve these to:
- `@router402/types` → `../packages/types/src/index.ts`
- `@router402/utils` → `../packages/utils/src/index.ts`

**Benefits**:
- No build step required during development
- Hot reload works across packages
- Full type safety with instant feedback

### Middleware Stack

1. **helmet** - Security headers
2. **cors** - Cross-origin resource sharing
3. **express.json()** - JSON body parsing
4. **Request logging** - Custom logger

### Error Handling

- **404 Handler** - Standardized error response for unknown routes
- **Global Error Handler** - Catches all unhandled errors
- **Graceful Shutdown** - SIGTERM/SIGINT handlers

## Adding Routes

1. Create route file in `src/routes/`:

```typescript
// src/routes/example.ts
import { Router, type Request, type Response } from "express";

export const exampleRouter: Router = Router();

exampleRouter.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello!" });
});
```

2. Register in `src/index.ts`:

```typescript
import { exampleRouter } from "./routes/example.js";
app.use("/example", exampleRouter);
```

## Development Workflow

### Hot Reload

The `tsx watch` command monitors:
- All files in `server/src/`
- Shared packages in `../packages/*/src/`

Changes trigger automatic server restart.

### Type Checking

TypeScript checks code from:
- Server source files
- Imported local packages
- node_modules type definitions

Run `bun run typecheck` before committing.

## Production Deployment

```bash
# Build server
bun run build

# Set production environment
export NODE_ENV=production

# Start server
bun run start
```

The build output goes to `dist/` directory.

## Troubleshooting

### Import errors
- Ensure packages are installed: `bun install`
- Check TypeScript paths in `tsconfig.json`

### Port already in use
- Change `PORT` in `.env`
- Or kill process: `lsof -ti:3001 | xargs kill`

### Type errors
- Run `bun run typecheck` to see all errors
- Check shared package type definitions
