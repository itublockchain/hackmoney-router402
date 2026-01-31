/**
 * Debt Service
 *
 * Manages user debt checks against configured threshold.
 */

import { logger } from "@router402/utils";
import { PrismaClient } from "../../generated/prisma/client.js";
import type { Config } from "../config/index.js";

const debtLogger = logger.context("DebtService");

let prisma: PrismaClient | null = null;
let debtThreshold = process.env.DEBT_THRESHOLD
  ? Number(process.env.DEBT_THRESHOLD)
  : 0.5;

/**
 * Initialize the debt service with Prisma client and config
 */
export function initDebtService(client: PrismaClient, config: Config): void {
  prisma = client;
  debtThreshold = config.DEBT_THRESHOLD;
  debtLogger.info("Debt service initialized", { threshold: debtThreshold });
}

/**
 * Get configured debt threshold
 */
export function getDebtThreshold(): number {
  return debtThreshold;
}

/**
 * Get Prisma client or throw if not initialized
 */
function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error(
      "Debt service not initialized. Call initDebtService first."
    );
  }
  return prisma;
}

/**
 * Get user's current debt as number
 */
export async function getUserDebt(walletAddress: string): Promise<number> {
  try {
    const db = getPrisma();
    const user = await db.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      select: { currentDebt: true },
    });

    return user?.currentDebt.toNumber() ?? 0;
  } catch (error) {
    debtLogger.error("Failed to get user debt", {
      wallet: walletAddress.slice(0, 10),
      error,
    });
    return 0;
  }
}

/**
 * Check if user's debt is below the configured threshold
 */
export async function isDebtBelowThreshold(
  walletAddress: string
): Promise<boolean> {
  try {
    const db = getPrisma();
    const user = await db.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      select: { currentDebt: true },
    });

    if (!user) {
      // New user - no debt, below threshold
      return true;
    }

    const debt = user.currentDebt.toNumber();
    const belowThreshold = debt < debtThreshold;

    debtLogger.debug("Debt threshold check", {
      wallet: walletAddress.slice(0, 10),
      debt,
      threshold: debtThreshold,
      belowThreshold,
    });

    return belowThreshold;
  } catch (error) {
    debtLogger.error("Failed to check debt threshold", {
      wallet: walletAddress.slice(0, 10),
      error,
    });
    // On error, don't grant access - require payment
    return false;
  }
}

/**
 * Add to user's debt
 */
export async function addUserDebt(
  walletAddress: string,
  amount: number
): Promise<void> {
  const db = getPrisma();

  await db.user.upsert({
    where: { walletAddress: walletAddress.toLowerCase() },
    update: { currentDebt: { increment: amount } },
    create: {
      walletAddress: walletAddress.toLowerCase(),
      currentDebt: amount,
    },
  });

  debtLogger.info("User debt added", {
    wallet: walletAddress.slice(0, 10),
    added: amount,
  });
}

/**
 * Reset user's debt to zero (after payment)
 */
export async function resetUserDebt(walletAddress: string): Promise<void> {
  const db = getPrisma();

  await db.user.update({
    where: { walletAddress: walletAddress.toLowerCase() },
    data: { currentDebt: 0 },
  });

  debtLogger.info("User debt reset", { wallet: walletAddress.slice(0, 10) });
}
