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

export interface CheckUserStatusResult {
  exists: boolean;
  hasSessionKey: boolean;
  fieldsComplete: boolean;
  ready: boolean;
  user?: {
    walletAddress: string;
    hasPaymentThreshold: boolean;
    currentDebt: string;
    totalSpent: string;
  };
  sessionKey?: {
    chainId: number;
    smartAccountAddress: string;
    createdAt: Date;
  };
}

/**
 * Check user status by wallet address.
 * Returns information about whether the user exists, has a session key,
 * and has all required fields populated.
 *
 * @param walletAddress - The wallet address to check
 * @returns CheckUserStatusResult with user status information
 */
export async function checkUserStatus(
  walletAddress: string
): Promise<CheckUserStatusResult> {
  const db = getPrisma();
  const normalizedAddress = walletAddress.toLowerCase();

  // Find user by wallet address
  const user = await db.user.findUnique({
    where: { walletAddress: normalizedAddress },
    include: {
      sessionKeyRecords: true,
    },
  });

  // User doesn't exist
  if (!user) {
    return {
      exists: false,
      hasSessionKey: false,
      fieldsComplete: false,
      ready: false,
    };
  }

  // Check if session key exists
  const sessionKeyRecord = user.sessionKeyRecords[0] || null;
  const hasSessionKey = sessionKeyRecord !== null;

  // Check if all required fields are populated
  const hasWalletAddress = !!user.walletAddress;
  const hasPaymentThreshold = user.paymentThreshold !== null;
  const fieldsComplete = hasWalletAddress && hasPaymentThreshold;

  // User is ready if all conditions are met
  const ready = hasSessionKey && fieldsComplete;

  authLogger.debug("User status checked", {
    wallet: normalizedAddress.slice(0, 10),
    exists: true,
    hasSessionKey,
    fieldsComplete,
    ready,
  });

  return {
    exists: true,
    hasSessionKey,
    fieldsComplete,
    ready,
    user: {
      walletAddress: user.walletAddress,
      hasPaymentThreshold,
      currentDebt: user.currentDebt.toString(),
      totalSpent: user.totalSpent.toString(),
    },
    sessionKey: sessionKeyRecord
      ? {
          chainId: sessionKeyRecord.chainId,
          smartAccountAddress: sessionKeyRecord.smartAccountAddress,
          createdAt: sessionKeyRecord.createdAt,
        }
      : undefined,
  };
}
