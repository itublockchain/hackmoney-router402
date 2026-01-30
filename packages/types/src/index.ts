// Health check response type
export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  version: string;
}

// EIP-712 Domain definition (example shared type)
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

// API Error response
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

// Standardized API response wrapper
export interface ApiResponseMeta {
  timestamp: string;
  path: string;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  meta: ApiResponseMeta;
}
