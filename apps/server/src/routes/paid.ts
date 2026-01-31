import { logger } from "@router402/utils";
import {
  Router as ExpressRouter,
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from "express";
// x402 imports from submodule dist
import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "../../external/x402/typescript/packages/core/dist/esm/server/index.mjs";
import { paymentMiddlewareFromHTTPServer } from "../../external/x402/typescript/packages/http/express/dist/esm/index.mjs";
import { registerExactEvmScheme } from "../../external/x402/typescript/packages/mechanisms/evm/dist/esm/exact/server/index.mjs";
import type { Config } from "../config/index.js";
import { registerX402Hooks, registerX402HTTPHooks } from "../hooks/index.js";

const routeLogger = logger.context("x402:Routes");

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
          network: "eip155:84532" as const,
          payTo,
        },
      ],
      description: "Access to protected content",
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
    // biome-ignore lint/suspicious/noExplicitAny: Express types version mismatch between project and x402 submodule
    x402Middleware(req as any, res as any, next);
  });

  // Protected endpoint
  paidRouter.get("/protected", (_req, res) => {
    res.json({
      message: "This content is behind a paywall",
      timestamp: new Date().toISOString(),
    });
  });

  return paidRouter;
}
