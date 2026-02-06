import { z } from "zod";

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const AuthorizeRequestSchema = z.object({
  smartAccountAddress: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Smart Account address format"),
  privateKey: z.string().min(1, "Private key is required"),
  serializedSessionKey: z.string().min(1, "Serialized session key is required"),
  eoaAddress: z
    .string()
    .regex(ethereumAddressRegex, "Invalid EOA address format"),
  chainId: z
    .number()
    .int("Chain ID must be an integer")
    .positive("Chain ID must be positive"),
  nonce: z
    .number()
    .int("Nonce must be an integer")
    .nonnegative("Nonce must be non-negative"),
});

export type AuthorizeRequestBody = z.infer<typeof AuthorizeRequestSchema>;

export interface AuthorizeResponse {
  token: string;
  sessionKeyId: string;
}

export interface AuthorizeErrorResponse {
  error: string;
  details?: Record<string, string>;
}

// User Status Check Types
export const CheckUserStatusSchema = z.object({
  walletAddress: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address format"),
});

export type CheckUserStatusQuery = z.infer<typeof CheckUserStatusSchema>;

export interface UserStatusResponse {
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
    createdAt: string;
  };
}
