# Router 402 - Web Frontend

Next.js 16 application with Web3 integration for decentralized payment routing on Base.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19.2.3
- **Styling**: TailwindCSS v4
- **UI Components**: Shadcn/UI with Radix primitives
- **Web3**: RainbowKit + Wagmi + Viem
- **Blockchain**: Base Mainnet (ChainID 8453)
- **Animations**: Framer Motion
- **Theme**: next-themes (dark mode default)
- **Package Manager**: Bun

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Setup

Create a `.env.local` file:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
```

Get your WalletConnect Project ID from: https://cloud.walletconnect.com/

### 3. Run Development Server

```bash
bun run dev
```

Open http://localhost:3000 in your browser.

### 4. Build for Production

```bash
bun run build
bun run start
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run Biome linter
- `bun run format` - Format code with Biome
- `bun run typecheck` - Run TypeScript type checking

## Project Structure

```
apps/web/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── ui/          # Shadcn UI components
│   │   ├── layout/      # Layout components (Navbar, Footer)
│   │   └── animations/  # Framer Motion components
│   ├── providers/       # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── config/          # Configuration files
│   └── lib/             # Utility functions
├── public/              # Static assets
└── package.json
```

## Key Features

### Web3 Integration
- RainbowKit wallet connection
- Base Mainnet (ChainID 8453)
- Wagmi hooks for blockchain interaction
- Smart account integration (Biconomy - scaffolded)

### UI Components
- Button, Card, Input, Dialog, Toast (Sonner)
- Dark mode theme (default)
- Responsive design
- Accessible components (Radix UI)

### Layout
- Sticky navigation with wallet connect
- Footer with network status indicator
- Page transitions with Framer Motion

## Configuration

### Wagmi Configuration
Located in `src/config/wagmi.ts`. Configured for:
- Base Mainnet (ChainID 8453)
- RainbowKit integration
- SSR support

### Theme Configuration
Dark mode is the default and system preferences are disabled. Modify in `src/app/layout.tsx`:

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem={false}
  disableTransitionOnChange
>
```

## Logging

This application uses a centralized logging system from `@repo/logger` instead of `console.log`. Pre-configured logger instances are available for different parts of the application.

### Available Loggers

Import from `@/lib/logger`:

```tsx
import { apiLogger, uiLogger, configLogger, stateLogger, routeLogger } from '@/lib/logger';
```

- **`apiLogger`** - For API calls and network requests
- **`uiLogger`** - For UI interactions and component lifecycle
- **`configLogger`** - For configuration and initialization
- **`stateLogger`** - For state management operations
- **`routeLogger`** - For routing and navigation

### Usage Examples

```tsx
// API calls
apiLogger.info('Fetching user data', { userId: 123 });
apiLogger.error('API call failed', { error: err.message, endpoint: '/api/user' });

// UI components
uiLogger.debug('Component mounted', { componentName: 'Header' });
uiLogger.warn('Deprecated prop used', { prop: 'oldProp' });

// Configuration
configLogger.info('App initialized', { env: process.env.NODE_ENV });
configLogger.error('Invalid config', { config });

// State management
stateLogger.debug('State updated', { action: 'SET_USER', payload });

// Routing
routeLogger.info('Route changed', { from: '/home', to: '/profile' });
```

### Log Levels

- `logger.debug()` - Detailed debugging information
- `logger.info()` - General informational messages
- `logger.warn()` - Warning messages
- `logger.error()` - Error messages

### Creating Custom Loggers

For feature-specific logging, create custom logger instances:

```tsx
import { Logger } from '@/lib/logger';

const paymentLogger = new Logger('frontend:payment');
paymentLogger.info('Payment initiated', { amount, currency });
```

### Best Practices

1. **Never use `console.log`** - Always use the appropriate logger
2. **Include context** - Pass relevant data as the second parameter
3. **Choose the right logger** - Use the pre-configured logger that matches your use case
4. **Use appropriate log levels** - Debug for development, info for important events, warn for issues, error for failures
5. **Add structured data** - Pass objects with meaningful keys for better debugging

## Next Steps

1. Get a WalletConnect Project ID and add to `.env.local`
2. Implement Biconomy Smart Account integration in `src/hooks/use-smart-account.ts`
3. Build payment routing features
4. Add comprehensive error handling
5. Implement loading states

## Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [RainbowKit Documentation](https://rainbowkit.com)
- [Wagmi Documentation](https://wagmi.sh)
- [Shadcn/UI Documentation](https://ui.shadcn.com)
- [Base Network](https://base.org)
