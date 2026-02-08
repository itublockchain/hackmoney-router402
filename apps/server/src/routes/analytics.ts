/**
 * Analytics Router
 *
 * Provides the GET /v1/analytics endpoint for authenticated users
 * to retrieve their analytics data (debt, usage, payments, model breakdown).
 *
 * Uses JWT Bearer token authentication via a custom auth middleware.
 * This endpoint is NOT behind the x402 payment wall.
 *
 * @see Requirement 1.1 - Valid JWT grants access
 * @see Requirement 1.2 - Invalid JWT returns 401
 * @see Requirement 1.3 - Missing Authorization header returns 401
 * @see Requirement 6.1 - Response in ApiResponse format
 * @see Requirement 6.2 - Success returns 200
 * @see Requirement 6.3 - Errors return 500 via global error handler
 * @see Requirement 7.1 - No x402 payment middleware
 * @see Requirement 7.2 - Served at GET /v1/analytics
 */

import type { ApiResponse } from "@router402/types";
import { logger } from "@router402/utils";
import {
  Router as ExpressRouter,
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from "express";
import { getUserAnalytics } from "../services/analytics.service.js";
import { verifyToken } from "../services/auth.service.js";
import type { AnalyticsData } from "../types/analytics.js";

const analyticsLogger = logger.context("AnalyticsRouter");

/**
 * JWT authentication middleware.
 *
 * Extracts and verifies a Bearer token from the Authorization header.
 * On success, attaches the JwtPayload to req.user and calls next().
 * On failure, returns a 401 ApiResponse.
 *
 * @see Requirement 1.1 - Valid token passes through
 * @see Requirement 1.2 - Invalid/expired token returns 401
 * @see Requirement 1.3 - Missing header returns 401
 */
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    analyticsLogger.debug("Missing or malformed Authorization header");
    const errorResponse: ApiResponse = {
      data: null,
      error: "Unauthorized",
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    analyticsLogger.debug("Invalid or expired JWT token");
    const errorResponse: ApiResponse = {
      data: null,
      error: "Unauthorized",
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  req.user = payload;
  next();
}

/**
 * Create the analytics router with JWT-protected GET / endpoint.
 *
 * @returns Express Router instance for analytics
 *
 * @see Requirement 6.1 - ApiResponse format with data, error, meta
 * @see Requirement 6.2 - 200 status on success
 * @see Requirement 6.3 - Errors forwarded to global error handler via next(error)
 * @see Requirement 7.1 - No x402 middleware
 * @see Requirement 7.2 - Mounted at /v1/analytics
 */
export function createAnalyticsRouter(): Router {
  const router = ExpressRouter();

  router.get(
    "/",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        if (!user) {
          next(new Error("User not found in request"));
          return;
        }
        const { userId } = user;
        const analytics = await getUserAnalytics(userId);

        const response: ApiResponse<AnalyticsData> = {
          data: analytics,
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        };

        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
