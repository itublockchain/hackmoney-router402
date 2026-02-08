// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Payment record status
 */
export type PaymentStatus = "PENDING" | "SETTLED";

/**
 * Individual payment record in the user's payment history.
 * All Decimal values are serialized as strings.
 */
export interface PaymentRecord {
  id: string;
  /** Payment amount (Decimal → string) */
  amount: string;
  /** Transaction hash, null if not yet settled */
  txHash: string | null;
  /** Payment status */
  status: PaymentStatus;
  /** ISO 8601 formatted creation date */
  createdAt: string;
}

/**
 * Per-model usage breakdown showing token counts and cost.
 * All Decimal values are serialized as strings.
 */
export interface ModelUsage {
  /** Model identifier */
  model: string;
  /** Total prompt tokens for this model */
  promptTokens: number;
  /** Total completion tokens for this model */
  completionTokens: number;
  /** Total tokens (prompt + completion) for this model */
  totalTokens: number;
  /** Total cost for this model (Decimal → string) */
  totalCost: string;
  /** Number of requests made with this model */
  requestCount: number;
}

/**
 * Complete analytics data returned by the GET /v1/analytics endpoint.
 * All Decimal values are serialized as strings per Requirements 6.1, 6.4.
 */
export interface AnalyticsData {
  /** User debt information */
  debt: {
    /** Current outstanding debt (Decimal → string) */
    currentDebt: string;
    /** Total amount spent (Decimal → string) */
    totalSpent: string;
    /** Payment threshold (Decimal → string) */
    paymentThreshold: string;
  };
  /** Aggregated usage statistics */
  usage: {
    /** Total prompt tokens across all requests */
    totalPromptTokens: number;
    /** Total completion tokens across all requests */
    totalCompletionTokens: number;
    /** Total tokens (prompt + completion) */
    totalTokens: number;
    /** Total cost across all requests (Decimal → string) */
    totalCost: string;
    /** Total number of requests */
    requestCount: number;
  };
  /** Per-model usage breakdown */
  modelBreakdown: ModelUsage[];
  /** Payment history and totals */
  payments: {
    /** List of payment records, ordered by createdAt descending */
    history: PaymentRecord[];
    /** Total paid amount from SETTLED payments only (Decimal → string) */
    totalPaid: string;
  };
}
