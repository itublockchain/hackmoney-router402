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

// HTTP Method types
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// API Client Configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
}

// Request/Response Interceptor types
export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor<T = unknown> = (response: T) => T | Promise<T>;

export type ErrorInterceptor = (error: unknown) => never;

export interface RequestConfig {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

// API Client Error class
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
    public isNetworkError = false
  ) {
    super(message);
    this.name = "ApiClientError";
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}
