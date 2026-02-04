/**
 * Authorization Router
 *
 * Handles session key authorization requests with EIP-712 signature verification.
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
 * Uses EIP-712 typed data signature verification.
 *
 * Headers:
 *   x-authorization-signature: EIP-712 signature of the authorization message
 *
 * Body:
 *   smartAccountAddress: Smart Account address
 *   privateKey: Private key for session key
 *   serializedSessionKey: Serialized session key data
 *   chainId: Blockchain network ID
 *   nonce: Unique nonce for replay protection
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

    // 2. Validate request body first to get chainId and nonce
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

    const { smartAccountAddress, privateKey, chainId, nonce } =
      validationResult.data;

    // 3. Verify EIP-712 signature and recover wallet address
    const verificationResult = await verifyAuthorizationSignature(
      signature,
      {
        smartAccountAddress: smartAccountAddress as `0x${string}`,
        privateKey,
        chainId: BigInt(chainId),
        nonce: BigInt(nonce),
      },
      chainId
    );

    if (!verificationResult.isValid || !verificationResult.walletAddress) {
      authLogger.warn("Invalid EIP-712 signature", {
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
