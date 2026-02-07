/**
 * Request Context using AsyncLocalStorage
 *
 * Allows sharing request-scoped data (like wallet address) across
 * different parts of the request lifecycle without passing through middleware.
 */

import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  walletAddress?: string;
  smartAccountAddress?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current wallet address from request context
 */
export function getWalletAddress(): string | undefined {
  return requestContext.getStore()?.walletAddress;
}

/**
 * Set the wallet address in request context
 */
export function setWalletAddress(address: string): void {
  const store = requestContext.getStore();
  if (store) {
    store.walletAddress = address.toLowerCase();
  }
}

/**
 * Get the current smart account address from request context
 */
export function getSmartAccountAddressFromContext(): string | undefined {
  return requestContext.getStore()?.smartAccountAddress;
}

/**
 * Set the smart account address in request context
 */
export function setSmartAccountAddress(address: string): void {
  const store = requestContext.getStore();
  if (store) {
    store.smartAccountAddress = address.toLowerCase();
  }
}
