import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware } from "@x402/express";
import { Router as ExpressRouter, type Router } from "express";
import type { Config } from "../config/index.js";

export function createPaidRouter(config: Config): Router {
  const paidRouter: Router = ExpressRouter();
  const payTo = config.PAY_TO;

  // Create facilitator client (testnet)
  const facilitatorClient = new HTTPFacilitatorClient({
    url: "https://x402.org/facilitator",
  });

  // Create resource server and register EVM scheme
  const server = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(server);

  // Apply payment middleware to protected routes
  paidRouter.use(
    paymentMiddleware(
      {
        "GET /protected": {
          accepts: [
            {
              scheme: "exact",
              price: "$0.1",
              network: "eip155:84532", // Base Sepolia (testnet)
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
