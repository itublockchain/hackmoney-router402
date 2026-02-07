# LiFi MCP Server (TypeScript)

A TypeScript implementation of the LiFi MCP (Model Context Protocol) server for cross-chain swaps and blockchain interactions.

## Features

- **LiFi API Integration**: Get quotes, tokens, chains, connections, and transaction status
- **Blockchain Read Operations**: Check native and ERC20 token balances, allowances

## Installation

```bash
bun install
```

## Usage

### Running Without Wallet (Read-Only Mode)

```bash
bun run start
```

Or in development mode:

```bash
bun run dev
```

## Available Tools

### LiFi API Tools

| Tool | Description |
|------|-------------|
| `get-tokens` | Get all known tokens from LiFi API |
| `get-token` | Get information about a specific token |
| `get-quote` | Get a quote for token transfers/swaps |
| `get-status` | Check the status of a cross-chain transfer |
| `get-chains` | Get information about supported chains |
| `get-connections` | Get information about possible connections between chains |
| `get-tools` | Get available bridges and exchanges |
| `get-chain-by-id` | Get chain information by ID |
| `get-chain-by-name` | Get chain information by name |

### Blockchain Read Tools

| Tool | Description |
|------|-------------|
| `get-native-token-balance` | Get native token balance for an address |
| `get-token-balance` | Get ERC20 token balance for an address |
| `get-allowance` | Check ERC20 token allowance for a spender |

## MCP Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "lifi-mcp": {
      "command": "bun",
      "args": ["run", "start"],
      "cwd": "/path/to/apps/mcp"
    }
  }
}
```

## Development

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Build
bun run build
```

## License

MIT
