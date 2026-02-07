# Router 402 VS Code Extension

AI-powered coding assistant. Pay per use via smart accounts on Base network.

![Demo](https://www.router402.xyz/demo/demo-vscode.gif)

## Features

- **Review Current File** — Get a comprehensive code review with actionable feedback
- **Edit Selection** — Select code and describe the changes you want; accept or reject via diff view
- **Explain Selection** — Get clear explanations of selected code
- **Inline Edit** — Right-click on selected code for quick AI-powered edits
- **Chat Panel** — Sidebar chat interface for ongoing conversations about your code
- **Open Dashboard** — Quick access to the Router 402 web dashboard

## Installation

### From VSIX

1. Download the `.vsix` file from releases
2. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded file

### From VS Code Marketplace

Search for "Router 402" in the Extensions panel.

## Configuration

1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Router 402"
3. Set your **API key** (required) — get one from the [Router 402 Dashboard](https://router402.xyz)
4. Optionally change the **API endpoint** or **default model**

Before using the extension, you must complete setup on the [Router 402 Dashboard](https://router402.xyz) and obtain an API key. The extension authenticates using this API key.

## Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| Router 402: Review Current File | Reviews the active file for bugs, performance, and best practices | — |
| Router 402: Edit Selection | Edits selected code based on your instruction | `Ctrl+Shift+R` / `Cmd+Shift+R` |
| Router 402: Explain Selection | Explains the selected code | — |
| Router 402: Inline Edit | Right-click context menu edit | — |
| Router 402: Open Chat | Opens the sidebar chat panel | `Ctrl+Shift+L` / `Cmd+Shift+L` |
| Router 402: Open Dashboard | Opens the web dashboard in your browser | — |

## How It Works

Router 402 sends your code to the Router 402 API, which routes requests to AI models via OpenRouter. You pay per use through smart accounts on the Base network — no API keys or subscriptions needed.

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local development and testing instructions.

## License

MIT
