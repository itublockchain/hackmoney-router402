import { logger } from "@router402/utils";
import {
  Router as ExpressRouter,
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from "express";
// x402 imports from submodule dist
import { decodePaymentSignatureHeader } from "../../external/x402/typescript/packages/core/dist/esm/http/index.mjs";
import type { HTTPRequestContext } from "../../external/x402/typescript/packages/core/dist/esm/server/index.mjs";
import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "../../external/x402/typescript/packages/core/dist/esm/server/index.mjs";
import { paymentMiddlewareFromHTTPServer } from "../../external/x402/typescript/packages/http/express/dist/esm/index.mjs";
import { registerExactEvmScheme } from "../../external/x402/typescript/packages/mechanisms/evm/dist/esm/exact/server/index.mjs";
import type { Config } from "../config/index.js";
import { registerX402Hooks, registerX402HTTPHooks } from "../hooks/index.js";
import { getUserDebt } from "../services/debt.js";
import { requestContext } from "../utils/request-context.js";
import { extractWalletFromPayload } from "../utils/signature.js";
import { createChatRouter } from "./chat.js";

const routeLogger = logger.context("x402:Routes");

/**
 * Dynamic price function that returns user's current debt
 */
/**
 * Dynamic price function that returns user's current debt
 * Returns "0" when no payment header (JWT auth case - access already granted by hook)
 */
async function getDynamicPrice(context: HTTPRequestContext): Promise<string> {
  const paymentHeader = context.paymentHeader;
  if (!paymentHeader) {
    // No payment header means JWT auth was used - return 0 as price
    // The onProtectedRequest hook already granted access
    return "0";
  }

  const payload = decodePaymentSignatureHeader(paymentHeader);
  const innerPayload = payload.payload as Record<string, unknown>;
  const wallet = extractWalletFromPayload(innerPayload);

  if (!wallet) {
    // No wallet in payload - return 0 to allow hook to handle
    return "0";
  }

  const debt = await getUserDebt(wallet);
  routeLogger.debug("Dynamic price calculated", {
    wallet: wallet.slice(0, 10),
    debt,
  });
  return `${debt.toFixed(8)}`;
}

export function createPaidRouter(config: Config): Router {
  const paidRouter: Router = ExpressRouter();
  const payTo = config.PAY_TO;

  // Create facilitator client
  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.FACILITATOR_URL,
  });

  // Create resource server and register EVM scheme
  const resourceServer = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(resourceServer);

  // Register lifecycle hooks (verify, settle)
  registerX402Hooks(resourceServer);

  // Define routes configuration
  const routes = {
    "GET /protected": {
      accepts: [
        {
          scheme: "exact",
          price: "$0.01",
          network: "eip155:84532" as const, // Base Mainnet
          payTo,
        },
      ],
      description: "Access to protected content",
      mimeType: "application/json",
    },
    "POST /chat/completions": {
      accepts: [
        {
          scheme: "exact",
          price: getDynamicPrice, // Dynamic price based on user's debt
          network: "eip155:84532" as const, // Base Mainnet
          payTo,
        },
      ],
      description: "OpenRouter-compatible LLM chat completions",
      mimeType: "application/json",
    },
  };

  // Create HTTP resource server with routes
  const httpServer = new x402HTTPResourceServer(resourceServer, routes);

  // Register HTTP-level hooks (onProtectedRequest for API key bypass, subscription check, etc.)
  registerX402HTTPHooks(httpServer);

  routeLogger.info("x402 HTTP Resource Server configured with hooks");

  // Get the payment middleware and wrap it for Express compatibility
  const x402Middleware = paymentMiddlewareFromHTTPServer(httpServer);

  // Apply payment middleware to all routes in this router
  paidRouter.use((req: Request, res: Response, next: NextFunction) => {
    // Run the rest of the request in an async context for wallet tracking
    requestContext.run({ walletAddress: undefined }, () => {
      // biome-ignore lint/suspicious/noExplicitAny: Express types version mismatch between project and x402 submodule
      x402Middleware(req as any, res as any, next);
    });
  });

  // Protected endpoint
  paidRouter.get("/protected", (_req, res) => {
    res.json({
      message: "This content is behind a paywall",
      timestamp: new Date().toISOString(),
    });
  });

  // Mount chat router for OpenRouter-compatible LLM chat completions
  paidRouter.use("/", createChatRouter());

  return paidRouter;
}
