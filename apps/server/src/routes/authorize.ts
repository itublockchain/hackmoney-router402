/**
 * Authorization Router
 *
 * Handles session key authorization requests.
 */

import type { ApiResponse } from "@router402/types";
import { logger } from "@router402/utils";
import {
  Router as ExpressRouter,
  type Request,
  type Response,
  type Router,
} from "express";
import { ZodError } from "zod";
import { authorize } from "../services/auth.service.js";
import {
  AuthorizeRequestSchema,
  type AuthorizeResponse,
} from "../types/authorize.js";
import { verifyAuthorizationSignature } from "../utils/signature-verifier.js";

const authLogger = logger.context("AuthRouter");

export const authorizeRouter: Router = ExpressRouter();

/**
 * Format Zod validation errors into a readable format
 */
function formatZodError(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    details[path] = issue.message;
  }
  return details;
}

/**
 * POST /authorize
 *
 * Authorizes a session key and returns an authorization token.
 *
 * Headers:
 *   x-authorization-signature: Signature of the request body
 *
 * Body:
 *   saAddress: Smart Account address
 *   privateKey: Private key for session key
 *   serializedSessionKey: Serialized session key data
 *   chainId: Blockchain network ID
 */
authorizeRouter.post("/", async (req: Request, res: Response) => {
  try {
    // 1. Check for signature header
    const signature = req.headers["x-authorization-signature"];
    if (!signature || typeof signature !== "string") {
      const errorResponse: ApiResponse = {
        data: null,
        error: "Missing x-authorization-signature header",
        meta: {
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      };
      return res.status(400).json(errorResponse);
    }

    // 2. Verify signature and recover wallet address
    const message = JSON.stringify(req.body);
    const verificationResult = await verifyAuthorizationSignature(
      signature,
      message
    );

    if (!verificationResult.isValid || !verificationResult.walletAddress) {
      authLogger.warn("Invalid signature", {
        error: verificationResult.error,
      });
      const errorResponse: ApiResponse = {
        data: null,
        error: "Invalid signature",
        meta: {
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      };
      return res.status(401).json(errorResponse);
    }

    const walletAddress = verificationResult.walletAddress;

    // 3. Validate request body
    const validationResult = AuthorizeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const details = formatZodError(validationResult.error);
      authLogger.warn("Validation failed", { details });
      const errorResponse: ApiResponse = {
        data: null,
        error: "Validation failed",
        meta: {
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      };
      return res.status(400).json(errorResponse);
    }

    // 4. Authorize and create session key record
    const result = await authorize(walletAddress, validationResult.data);

    // 5. Return success response
    const successResponse: ApiResponse<AuthorizeResponse> = {
      data: {
        token: result.token,
        sessionKeyId: result.sessionKeyId,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    };

    authLogger.info("Authorization successful", {
      wallet: walletAddress.slice(0, 10),
      sessionKeyId: result.sessionKeyId,
    });

    return res.status(201).json(successResponse);
  } catch (error) {
    authLogger.error("Authorization error", { error });
    const errorResponse: ApiResponse = {
      data: null,
      error: "Internal server error",
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    };
    return res.status(500).json(errorResponse);
  }
});
