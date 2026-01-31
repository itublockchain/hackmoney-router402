import type {
  ApiClientError,
  ApiResponse,
  RequestConfig,
} from "@router402/types";
import { getConfig } from "@/config";
import { apiLogger } from "./logger";

/**
 * Custom error class for fetch wrapper errors
 */
class FetchError extends Error implements ApiClientError {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
    public isNetworkError = false
  ) {
    super(message);
    this.name = "FetchError";
    Object.setPrototypeOf(this, FetchError.prototype);
  }
}

/**
 * Request interceptor function type
 */
type FetchRequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function type
 */
type FetchResponseInterceptor = <T>(
  response: Response,
  data: T
) => T | Promise<T>;

/**
 * Error interceptor function type
 */
type FetchErrorInterceptor = (error: unknown) => never;

/**
 * Interceptor storage
 */
const interceptors = {
  request: [] as FetchRequestInterceptor[],
  response: [] as FetchResponseInterceptor[],
  error: [] as FetchErrorInterceptor[],
};

/**
 * Build URL with query parameters
 */
function buildUrl(
  baseUrl: string,
  url: string,
  params?: Record<string, string | number | boolean>
): string {
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  if (!params || Object.keys(params).length === 0) {
    return fullUrl;
  }

  const urlObj = new URL(fullUrl);
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.append(key, String(value));
  });

  return urlObj.toString();
}

/**
 * Get authentication token from storage
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

/**
 * Build request headers
 */
function buildHeaders(customHeaders?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...customHeaders,
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Process request through interceptors
 */
async function processRequestInterceptors(
  config: RequestConfig
): Promise<RequestConfig> {
  let processedConfig = config;

  for (const interceptor of interceptors.request) {
    processedConfig = await interceptor(processedConfig);
  }

  return processedConfig;
}

/**
 * Process response through interceptors
 */
async function processResponseInterceptors<T>(
  response: Response,
  data: T
): Promise<T> {
  let processedData = data;

  for (const interceptor of interceptors.response) {
    processedData = await interceptor(response, processedData);
  }

  return processedData;
}

/**
 * Process error through interceptors
 */
function processErrorInterceptors(error: unknown): never {
  for (const interceptor of interceptors.error) {
    interceptor(error);
  }
  throw error;
}

/**
 * Core fetch implementation with interceptors
 */
async function fetchWithInterceptors<T>(config: RequestConfig): Promise<T> {
  const appConfig = getConfig();
  const baseUrl = appConfig.NEXT_PUBLIC_API_URL;

  try {
    // Process request interceptors
    const processedConfig = await processRequestInterceptors(config);

    // Build URL
    const url = buildUrl(baseUrl, processedConfig.url, processedConfig.params);

    // Build headers
    const headers = buildHeaders(processedConfig.headers);

    // Build fetch options
    const options: RequestInit = {
      method: processedConfig.method,
      headers,
      credentials: "include",
      signal: processedConfig.signal,
    };

    // Add body for non-GET requests
    if (processedConfig.data && processedConfig.method !== "GET") {
      options.body = JSON.stringify(processedConfig.data);
    }

    // Log request in development
    if (appConfig.NODE_ENV === "development") {
      apiLogger.debug(`${processedConfig.method} ${url}`, {
        params: processedConfig.params,
        data: processedConfig.data,
      });
    }

    // Make request with timeout
    const timeout = processedConfig.timeout ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...options,
      signal: processedConfig.signal ?? controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response
    let data: unknown;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Log response in development
    if (appConfig.NODE_ENV === "development") {
      apiLogger.debug(`Response ${response.status} from ${url}`, { data });
    }

    // Handle non-OK responses
    if (!response.ok) {
      const apiResponse = data as ApiResponse;
      const errorMessage =
        apiResponse?.error || response.statusText || "Request failed";

      apiLogger.error("API Error", {
        status: response.status,
        message: errorMessage,
        url,
      });

      throw new FetchError(errorMessage, response.status, data, false);
    }

    // Unwrap ApiResponse if present
    const apiResponse = data as ApiResponse;
    if (
      apiResponse &&
      typeof apiResponse === "object" &&
      "data" in apiResponse &&
      "error" in apiResponse
    ) {
      if (apiResponse.error) {
        throw new FetchError(
          apiResponse.error,
          response.status,
          apiResponse,
          false
        );
      }
      data = apiResponse.data;
    }

    // Process response interceptors
    return await processResponseInterceptors(response, data as T);
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      apiLogger.error("Network Error", {
        message: error.message,
        url: config.url,
      });

      const networkError = new FetchError(
        "Network error: Unable to reach the server",
        undefined,
        undefined,
        true
      );
      return processErrorInterceptors(networkError);
    }

    // Handle abort errors
    if (error instanceof Error && error.name === "AbortError") {
      apiLogger.error("Request Timeout", { url: config.url });
      const timeoutError = new FetchError(
        "Request timeout",
        408,
        undefined,
        true
      );
      return processErrorInterceptors(timeoutError);
    }

    // Rethrow FetchError instances
    if (error instanceof FetchError) {
      return processErrorInterceptors(error);
    }

    // Handle unknown errors
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    apiLogger.error("Request Error", { message, url: config.url });
    return processErrorInterceptors(new FetchError(message));
  }
}

/**
 * Type-safe fetch wrapper methods
 */
export const fetchApi = {
  /**
   * Perform GET request
   */
  get: <T>(
    url: string,
    params?: Record<string, string | number | boolean>,
    config?: Partial<RequestConfig>
  ) =>
    fetchWithInterceptors<T>({
      url,
      method: "GET",
      params,
      ...config,
    }),

  /**
   * Perform POST request
   */
  post: <T>(url: string, data?: unknown, config?: Partial<RequestConfig>) =>
    fetchWithInterceptors<T>({
      url,
      method: "POST",
      data,
      ...config,
    }),

  /**
   * Perform PUT request
   */
  put: <T>(url: string, data?: unknown, config?: Partial<RequestConfig>) =>
    fetchWithInterceptors<T>({
      url,
      method: "PUT",
      data,
      ...config,
    }),

  /**
   * Perform PATCH request
   */
  patch: <T>(url: string, data?: unknown, config?: Partial<RequestConfig>) =>
    fetchWithInterceptors<T>({
      url,
      method: "PATCH",
      data,
      ...config,
    }),

  /**
   * Perform DELETE request
   */
  delete: <T>(url: string, config?: Partial<RequestConfig>) =>
    fetchWithInterceptors<T>({
      url,
      method: "DELETE",
      ...config,
    }),
};

/**
 * Add request interceptor
 */
export function addFetchRequestInterceptor(
  interceptor: FetchRequestInterceptor
): number {
  interceptors.request.push(interceptor);
  return interceptors.request.length - 1;
}

/**
 * Add response interceptor
 */
export function addFetchResponseInterceptor(
  interceptor: FetchResponseInterceptor
): number {
  interceptors.response.push(interceptor);
  return interceptors.response.length - 1;
}

/**
 * Add error interceptor
 */
export function addFetchErrorInterceptor(
  interceptor: FetchErrorInterceptor
): number {
  interceptors.error.push(interceptor);
  return interceptors.error.length - 1;
}

/**
 * Remove request interceptor
 */
export function removeFetchRequestInterceptor(index: number): void {
  interceptors.request.splice(index, 1);
}

/**
 * Remove response interceptor
 */
export function removeFetchResponseInterceptor(index: number): void {
  interceptors.response.splice(index, 1);
}

/**
 * Remove error interceptor
 */
export function removeFetchErrorInterceptor(index: number): void {
  interceptors.error.splice(index, 1);
}

/**
 * Export error class for error handling
 */
export { FetchError };
