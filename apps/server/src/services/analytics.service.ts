/**
 * Analytics Service
 *
 * Retrieves and aggregates user analytics data including debt information,
 * token usage statistics, model breakdown, and payment history.
 *
 * @module services/analytics.service
 * @see Requirements 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4
 */

import { logger } from "@router402/utils";
import { PrismaClient } from "../../generated/prisma/client.js";
import type {
  AnalyticsData,
  ModelUsage,
  PaymentRecord,
} from "../types/analytics.js";

const analyticsLogger = logger.context("AnalyticsService");

let prisma: PrismaClient | null = null;

/**
 * Initialize the analytics service with Prisma client.
 */
export function initAnalyticsService(client: PrismaClient): void {
  prisma = client;
  analyticsLogger.info("Analytics service initialized");
}

/**
 * Get Prisma client or throw if not initialized.
 */
function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error(
      "Analytics service not initialized. Call initAnalyticsService first."
    );
  }
  return prisma;
}

/**
 * Retrieve comprehensive analytics data for a user.
 *
 * Executes all database queries in parallel using Promise.all for optimal performance.
 * All Decimal values are converted to strings for JSON serialization.
 *
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to complete analytics data
 * @throws {Error} If user is not found (findUniqueOrThrow)
 *
 * @see Requirement 2.1 - Return currentDebt as string
 * @see Requirement 2.2 - Return totalSpent as string
 * @see Requirement 2.3 - Return paymentThreshold as string
 * @see Requirement 3.1 - Calculate total promptTokens
 * @see Requirement 3.2 - Calculate total completionTokens
 * @see Requirement 3.3 - Calculate total totalCost as string
 * @see Requirement 3.4 - Return total UsageRecord count
 * @see Requirement 4.1 - Group usage by model with per-model stats
 * @see Requirement 4.2 - Return empty array when no usage records
 * @see Requirement 5.1 - Return payments ordered by createdAt DESC
 * @see Requirement 5.2 - Include id, amount (string), txHash, status, createdAt
 * @see Requirement 5.3 - Return empty array when no payments
 * @see Requirement 5.4 - Calculate total paid from SETTLED payments only
 */
export async function getUserAnalytics(userId: string): Promise<AnalyticsData> {
  const db = getPrisma();

  analyticsLogger.debug("Fetching analytics for user", { userId });

  // Execute all queries in parallel
  const [user, usageAggregate, modelBreakdown, payments, totalPaid] =
    await Promise.all([
      // 1. User information (debt, totalSpent, paymentThreshold)
      db.user.findUniqueOrThrow({
        where: { id: userId },
      }),

      // 2. Usage totals (aggregate)
      db.usageRecord.aggregate({
        where: { userId },
        _sum: { promptTokens: true, completionTokens: true, totalCost: true },
        _count: true,
      }),

      // 3. Model breakdown (groupBy)
      db.usageRecord.groupBy({
        by: ["model"],
        where: { userId },
        _sum: { promptTokens: true, completionTokens: true, totalCost: true },
        _count: true,
      }),

      // 4. Payment history (ordered by createdAt DESC)
      db.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          txHash: true,
          status: true,
          createdAt: true,
        },
      }),

      // 5. Total paid amount (SETTLED only)
      db.payment.aggregate({
        where: { userId, status: "SETTLED" },
        _sum: { amount: true },
      }),
    ]);

  // Build model breakdown with Decimal → string conversion
  const formattedModelBreakdown: ModelUsage[] = modelBreakdown.map((entry) => {
    const promptTokens = entry._sum.promptTokens ?? 0;
    const completionTokens = entry._sum.completionTokens ?? 0;
    return {
      model: entry.model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      totalCost: entry._sum.totalCost?.toString() ?? "0",
      requestCount: entry._count,
    };
  });

  // Build payment history with Decimal → string conversion
  const formattedPayments: PaymentRecord[] = payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount.toString(),
    txHash: payment.txHash,
    status: payment.status as "PENDING" | "SETTLED",
    createdAt: payment.createdAt.toISOString(),
  }));

  // Calculate usage totals
  const totalPromptTokens = usageAggregate._sum.promptTokens ?? 0;
  const totalCompletionTokens = usageAggregate._sum.completionTokens ?? 0;

  const analyticsData: AnalyticsData = {
    debt: {
      currentDebt: user.currentDebt.toString(),
      totalSpent: user.totalSpent.toString(),
      paymentThreshold: user.paymentThreshold.toString(),
    },
    usage: {
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
      totalCost: usageAggregate._sum.totalCost?.toString() ?? "0",
      requestCount: usageAggregate._count,
    },
    modelBreakdown: formattedModelBreakdown,
    payments: {
      history: formattedPayments,
      totalPaid: totalPaid._sum.amount?.toString() ?? "0",
    },
  };

  analyticsLogger.debug("Analytics data retrieved", {
    userId,
    requestCount: analyticsData.usage.requestCount,
    modelCount: analyticsData.modelBreakdown.length,
    paymentCount: analyticsData.payments.history.length,
  });

  return analyticsData;
}
