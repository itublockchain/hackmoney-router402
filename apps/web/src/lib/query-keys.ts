/**
 * Query Keys Factory
 * Centralized query key management for React Query
 *
 * Usage:
 * - Use these factory functions to generate consistent query keys
 * - Keys are organized by feature/domain
 * - Each factory returns an array that can be used directly in useQuery
 *
 * Example:
 * const { data } = useQuery({
 *   queryKey: queryKeys.users.detail(userId),
 *   queryFn: () => fetchUser(userId)
 * })
 */

export const queryKeys = {
  // User-related queries
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Payment-related queries
  payments: {
    all: ["payments"] as const,
    lists: () => [...queryKeys.payments.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.payments.lists(), filters] as const,
    details: () => [...queryKeys.payments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
  },

  // Route-related queries
  routes: {
    all: ["routes"] as const,
    lists: () => [...queryKeys.routes.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.routes.lists(), filters] as const,
    details: () => [...queryKeys.routes.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.routes.details(), id] as const,
  },

  // Wallet/Balance-related queries
  wallet: {
    all: ["wallet"] as const,
    balance: (address: string) =>
      [...queryKeys.wallet.all, "balance", address] as const,
    transactions: (address: string) =>
      [...queryKeys.wallet.all, "transactions", address] as const,
  },
} as const;
