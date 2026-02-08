"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib";

export interface PaymentRecord {
  id: string;
  amount: string;
  txHash: string | null;
  status: "PENDING" | "SETTLED";
  createdAt: string;
}

export interface ModelUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: string;
  requestCount: number;
}

export interface AnalyticsData {
  debt: {
    currentDebt: string;
    totalSpent: string;
    paymentThreshold: string;
  };
  usage: {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCost: string;
    requestCount: number;
  };
  modelBreakdown: ModelUsage[];
  payments: {
    history: PaymentRecord[];
    totalPaid: string;
  };
}

export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics.data(),
    queryFn: () => api.get<AnalyticsData>("/v1/analytics"),
  });
}
