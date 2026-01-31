import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware } from "@x402/express";
import { Router as ExpressRouter, type Router } from "express";
import type { Config } from "../config/index.js";
import { registerX402Hooks } from "../hooks/index.js";

export function createPaidRouter(config: Config): Router {
  const paidRouter: Router = ExpressRouter();
  const payTo = config.PAY_TO;

  // Create facilitator client
  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.FACILITATOR_URL,
  });

  // Create resource server, register EVM scheme, and attach lifecycle hooks
  const server = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(server);
  registerX402Hooks(server);

  // Apply payment middleware to protected routes
  paidRouter.use(
    paymentMiddleware(
      {
        "GET /protected": {
          accepts: [
            {
              scheme: "exact",
              price: "$0.1",
              network: "eip155:84532" as const,
              payTo,
            },
          ],
          description: "Access to protected content",
          mimeType: "application/json",
        },
      },
      server
    )
  );

  // Protected endpoint
  paidRouter.get("/protected", (_req, res) => {
    res.json({
      message: "This content is behind a paywall",
      timestamp: new Date().toISOString(),
    });
  });

  return paidRouter;
}
