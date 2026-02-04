import { z } from "zod";

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const AuthorizeRequestSchema = z.object({
  smartAccountAddress: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Smart Account address format"),
  privateKey: z.string().min(1, "Private key is required"),
  serializedSessionKey: z.string().min(1, "Serialized session key is required"),
  chainId: z
    .number()
    .int("Chain ID must be an integer")
    .positive("Chain ID must be positive"),
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
