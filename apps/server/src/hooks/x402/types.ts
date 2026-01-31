/**
 * x402 Lifecycle Hooks Type Definitions
 *
 * Type definitions for x402 payment protocol hooks and payload structures.
 */

/**
 * Result for aborting a hook
 */
export interface AbortResult {
  abort: true;
  reason: string;
}

/**
 * Result for recovering from a failure
 */
export interface RecoveryResult<T> {
  recovered: true;
  result: T;
}

/**
 * Result for granting access without payment
 */
export interface GrantAccessResult {
  grantAccess: true;
}

/**
 * Authorization details from payment signature
 */
export interface PaymentAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

/**
 * Payment payload containing authorization and signature
 */
export interface PaymentPayloadData {
  authorization: PaymentAuthorization;
  signature: string;
}

/**
 * Resource information for the protected endpoint
 */
export interface PaymentResource {
  url: string;
  description: string;
  mimeType: string;
}

/**
 * Accepted payment scheme details
 */
export interface PaymentAccepted {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: {
    name: string;
    version: string;
  };
}

/**
 * Decoded Payment-Signature header structure
 */
export interface DecodedPaymentSignature {
  x402Version: number;
  payload: PaymentPayloadData;
  resource: PaymentResource;
  accepted: PaymentAccepted;
}
