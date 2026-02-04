/**
 * Authorization Service
 *
 * Handles session key authorization and JWT token generation.
 */

import { logger } from "@router402/utils";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/prisma/client.js";
import type { AuthorizeRequestBody } from "../types/authorize.js";
import { getOrCreateUser } from "./debt.js";

const authLogger = logger.context("AuthService");

let prisma: PrismaClient | null = null;
let jwtSecret: string | null = null;

// Token expires in 1 year
const TOKEN_EXPIRY = "1y";

/**
 * Initialize the auth service with Prisma client and JWT secret
 */
export function initAuthService(client: PrismaClient, secret: string): void {
  prisma = client;
  jwtSecret = secret;
  authLogger.info("Auth service initialized");
}

/**
 * Get Prisma client or throw if not initialized
 */
function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error(
      "Auth service not initialized. Call initAuthService first."
    );
  }
  return prisma;
}

/**
 * Get JWT secret or throw if not initialized
 */
function getJwtSecret(): string {
  if (!jwtSecret) {
    throw new Error(
      "Auth service not initialized. Call initAuthService first."
    );
  }
  return jwtSecret;
}

export interface AuthorizationResult {
  token: string;
  sessionKeyId: string;
  userId: string;
}

export interface JwtPayload {
  userId: string;
  sessionKeyId: string;
  walletAddress: string;
  chainId: number;
}

/**
 * Generate a JWT token for authorization
 */
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Authorize a session key for a wallet address.
 * Creates or retrieves the user and stores the session key record.
 *
 * @param walletAddress - The recovered wallet address from signature
 * @param data - The session key data from request body
 * @returns AuthorizationResult with token, sessionKeyId, and userId
 */
export async function authorize(
  walletAddress: string,
  data: AuthorizeRequestBody
): Promise<AuthorizationResult> {
  const db = getPrisma();

  // Get or create user by wallet address
  const user = await getOrCreateUser(walletAddress);

  // Generate JWT token first
  const tempToken = generateToken({
    userId: user.id,
    sessionKeyId: "", // Will be updated after upsert
    walletAddress: walletAddress.toLowerCase(),
    chainId: data.chainId,
  });

  // Upsert session key record - update if exists for this user, create otherwise
  const sessionKeyRecord = await db.sessionKeyRecord.upsert({
    where: { userId: user.id },
    update: {
      smartAccountAddress: data.smartAccountAddress.toLowerCase(),
      privateKey: data.privateKey,
      serializedSessionKey: data.serializedSessionKey,
      chainId: data.chainId,
      token: tempToken,
    },
    create: {
      userId: user.id,
      smartAccountAddress: data.smartAccountAddress.toLowerCase(),
      privateKey: data.privateKey,
      serializedSessionKey: data.serializedSessionKey,
      chainId: data.chainId,
      token: tempToken,
    },
  });

  // Generate final token with correct sessionKeyId
  const token = generateToken({
    userId: user.id,
    sessionKeyId: sessionKeyRecord.id,
    walletAddress: walletAddress.toLowerCase(),
    chainId: data.chainId,
  });

  // Update token with correct sessionKeyId
  await db.sessionKeyRecord.update({
    where: { id: sessionKeyRecord.id },
    data: { token },
  });

  authLogger.info("Session key authorized", {
    wallet: walletAddress.slice(0, 10),
    userId: user.id,
    sessionKeyId: sessionKeyRecord.id,
    chainId: data.chainId,
  });

  return {
    token,
    sessionKeyId: sessionKeyRecord.id,
    userId: user.id,
  };
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    return payload;
  } catch (error) {
    authLogger.debug("Token verification failed", { error });
    return null;
  }
}
