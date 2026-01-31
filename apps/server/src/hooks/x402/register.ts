/**
 * x402 Hook Registration
 */

import { logger } from "@router402/utils";
import type { x402ResourceServer } from "@x402/core/server";
import {
  onAfterSettle,
  onAfterVerify,
  onBeforeSettle,
  onBeforeVerify,
  onSettleFailure,
  onVerifyFailure,
} from "./handlers/index.js";

const hookLogger = logger.context("x402:Hooks");

/**
 * Registers lifecycle hooks on the x402ResourceServer
 */
export function registerX402Hooks(
  server: x402ResourceServer
): x402ResourceServer {
  hookLogger.info("Registering x402 lifecycle hooks");

  server
    .onBeforeVerify(onBeforeVerify)
    .onAfterVerify(onAfterVerify)
    .onVerifyFailure(onVerifyFailure)
    .onBeforeSettle(onBeforeSettle)
    .onAfterSettle(onAfterSettle)
    .onSettleFailure(onSettleFailure);

  hookLogger.info("x402 lifecycle hooks registered");

  return server;
}
