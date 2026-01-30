import {
  defineRoute,
  formatUptime,
  getCurrentTimestamp,
} from "@router402/utils";
import { Router as ExpressRouter, type Router } from "express";
import { z } from "zod";

export const healthRouter: Router = ExpressRouter();

const startTime = Date.now();
const version = "0.1.0";

// Define the health response schema with Zod
const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  timestamp: z.string(),
  uptime: z.number(),
  version: z.string(),
});

// Create a type-safe route handler with automatic validation
const getHealthHandler = defineRoute(
  {
    response: healthResponseSchema,
  },
  async (_req) => {
    // Return type is automatically inferred and validated
    return {
      status: "ok" as const,
      timestamp: getCurrentTimestamp(),
      uptime: formatUptime(startTime),
      version,
    };
  }
);

healthRouter.get("/", getHealthHandler);
