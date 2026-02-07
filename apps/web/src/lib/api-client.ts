import type {
  ApiClientError,
  ApiResponse,
  ErrorInterceptor,
  RequestInterceptor,
  ResponseInterceptor,
} from "@router402/types";
import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { getConfig } from "@/config";
import { useSmartAccountStore } from "@/stores/smart-account.store";
import { apiLogger } from "./logger";
import { getAuthToken } from "./session-keys/storage";

/**
 * Custom error class for API client errors
 */
class ClientError extends Error implements ApiClientError {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
    public isNetworkError = false
  ) {
    super(message);
    this.name = "ApiClientError";
    Object.setPrototypeOf(this, ClientError.prototype);
  }
}

/**
 * Create and configure axios instance with interceptors
 */
function createApiClient(): AxiosInstance {
  const config = getConfig();

  const instance = axios.create({
    baseURL: config.NEXT_PUBLIC_API_URL,
    timeout: 30000, // 30 seconds
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      // Log request in development
      if (config.NODE_ENV === "development") {
        apiLogger.debug(
          `${requestConfig.method?.toUpperCase()} ${requestConfig.url}`,
          {
            params: requestConfig.params,
            data: requestConfig.data,
          }
        );
      }

      // Add auth token if available (per-wallet)
      if (typeof window !== "undefined") {
        const smartAccountAddress = useSmartAccountStore.getState().address;
        const token = smartAccountAddress
          ? getAuthToken(smartAccountAddress)
          : null;
        if (token && requestConfig.headers) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }

      return requestConfig;
    },
    (error: unknown) => {
      apiLogger.error("Request interceptor error", { error });
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      // Log response in development
      if (config.NODE_ENV === "development") {
        apiLogger.debug(
          `Response ${response.status} from ${response.config.url}`,
          {
            data: response.data,
          }
        );
      }

      // If response is ApiResponse wrapper, extract data
      const data = response.data as ApiResponse;
      if (
        data &&
        typeof data === "object" &&
        "data" in data &&
        "error" in data
      ) {
        // Check if there's an error in the response
        if (data.error) {
          throw new ClientError(data.error, response.status, data, false);
        }
        // Return unwrapped data
        return { ...response, data: data.data };
      }

      return response;
    },
    (error: AxiosError) => {
      // Handle different error scenarios
      if (error.response) {
        // Server responded with error status
        const data = error.response.data as ApiResponse;
        const errorMessage =
          data?.error || error.message || "An error occurred";

        apiLogger.error("API Error", {
          status: error.response.status,
          message: errorMessage,
          url: error.config?.url,
        });

        throw new ClientError(
          errorMessage,
          error.response.status,
          error.response.data,
          false
        );
      }

      if (error.request) {
        // Request made but no response received
        apiLogger.error("Network Error", {
          message: error.message,
          url: error.config?.url,
        });

        throw new ClientError(
          "Network error: Unable to reach the server",
          undefined,
          undefined,
          true
        );
      }

      // Error in request setup
      apiLogger.error("Request Setup Error", { error });
      throw new ClientError(error.message || "Request failed");
    }
  );

  return instance;
}

/**
 * Global API client instance
 */
export const apiClient = createApiClient();

/**
 * Add custom request interceptor
 * @param onFulfilled - Function to handle successful requests
 * @param onRejected - Function to handle request errors
 * @returns Interceptor ID for removal
 */
export function addRequestInterceptor(
  onFulfilled?: RequestInterceptor,
  onRejected?: ErrorInterceptor
): number {
  return apiClient.interceptors.request.use(
    onFulfilled as never,
    onRejected as never
  );
}

/**
 * Add custom response interceptor
 * @param onFulfilled - Function to handle successful responses
 * @param onRejected - Function to handle response errors
 * @returns Interceptor ID for removal
 */
export function addResponseInterceptor<T = unknown>(
  onFulfilled?: ResponseInterceptor<T>,
  onRejected?: ErrorInterceptor
): number {
  return apiClient.interceptors.response.use(
    onFulfilled as never,
    onRejected as never
  );
}

/**
 * Remove request interceptor
 * @param interceptorId - ID returned from addRequestInterceptor
 */
export function removeRequestInterceptor(interceptorId: number): void {
  apiClient.interceptors.request.eject(interceptorId);
}

/**
 * Remove response interceptor
 * @param interceptorId - ID returned from addResponseInterceptor
 */
export function removeResponseInterceptor(interceptorId: number): void {
  apiClient.interceptors.response.eject(interceptorId);
}

/**
 * Export the error class for error handling
 */
export { ClientError as ApiClientError };

/**
 * Type-safe API methods with automatic unwrapping
 */
export const api = {
  get: <T>(url: string, config?: Parameters<typeof apiClient.get>[1]) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.post>[2]
  ) => apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.put>[2]
  ) => apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.patch>[2]
  ) => apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: Parameters<typeof apiClient.delete>[1]) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};
