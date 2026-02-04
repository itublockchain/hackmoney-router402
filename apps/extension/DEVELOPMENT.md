# Router 402 VS Code Extension — Development Guide

## Prerequisites

- Node.js >= 18
- VS Code >= 1.85.0
- npm (or bun, matching the monorepo)

## Setup

```bash
cd apps/extension
npm install
npm run compile
```

## Running the Extension Locally

1. Open the monorepo root in VS Code
2. Go to `apps/extension/` and make sure dependencies are installed
3. Open the file `apps/extension/src/extension.ts`
4. Press `F5` (or go to Run > Start Debugging)
   - This will open a new VS Code window called **"Extension Development Host"**
   - The extension will be loaded in this new window
5. In the Extension Development Host window:
   - Open any project/folder you want to test with
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Type "Router 402" to see available commands
   - Configure your wallet address: go to Settings (`Ctrl+,`) and search for "Router 402"

## Watch Mode (for faster development)

In a terminal, run:

```bash
cd apps/extension
npm run watch
```

This will recompile TypeScript on every save. Combined with the F5 debug launcher, you can reload the Extension Development Host (`Ctrl+R` in the host window) to pick up changes.

## Testing Commands

After launching the Extension Development Host:

1. **Test settings:** Go to Settings > search "Router 402" > set your wallet address and API endpoint
2. **Test review:** Open a code file > Command Palette > "Router 402: Review Current File"
3. **Test edit:** Select some code > Command Palette > "Router 402: Edit Selection" > type an instruction
4. **Test explain:** Select some code > Right-click > "Router 402: Explain Selection"
5. **Test chat:** Command Palette > "Router 402: Open Chat" > try sending messages
6. **Test inline edit:** Select some code > Right-click > "Router 402: Inline Edit" > type an instruction
7. **Test error handling:** Set an invalid wallet address and verify the error notification appears with an "Open Dashboard" button

## Packaging the Extension (for distribution)

```bash
cd apps/extension
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file you can install manually or publish to the VS Code marketplace.

## Troubleshooting

- **Extension not appearing:** Make sure you compiled first (`npm run compile`), check the Debug Console in VS Code for errors
- **Commands not showing:** Check that `activationEvents` in `package.json` match your command IDs
- **Webview blank:** Check the Developer Tools in the Extension Development Host (`Help > Toggle Developer Tools`) for console errors
- **API errors:** Check the Output panel (View > Output) and select "Router 402" from the dropdown
