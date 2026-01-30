import type { ApiResponse } from "@router402/types";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";

/**
 * Extract the inferred type from a Zod schema
 */
type Infer<T> = T extends z.ZodType<infer U> ? U : never;

/**
 * Route definition configuration with optional request schema (body, query, params)
 * and required response schema
 */
export interface RouteConfig<
  TBody extends z.ZodType | undefined = undefined,
  TQuery extends z.ZodType | undefined = undefined,
  TParams extends z.ZodType | undefined = undefined,
  TResponse extends z.ZodType = z.ZodType,
> {
  /** Zod schema for request body validation */
  body?: TBody;
  /** Zod schema for query parameters validation */
  query?: TQuery;
  /** Zod schema for route parameters validation */
  params?: TParams;
  /** Zod schema for response validation and type inference */
  response: TResponse;
}

/**
 * Typed request object with validated body, query, and params
 */
export interface TypedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
> {
  body: TBody;
  query: TQuery;
  params: TParams;
  raw: Request;
}

/**
 * Route handler function with typed request and response
 */
export type RouteHandler<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
  TResponse = unknown,
> = (
  req: TypedRequest<TBody, TQuery, TParams>
) => Promise<TResponse> | TResponse;

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  constructor(
    public field: "body" | "query" | "params" | "response",
    public issues: z.ZodIssue[]
  ) {
    super(`Validation failed for ${field}`);
    this.name = "ValidationError";
  }
}

/**
 * Creates a type-safe Express route handler with automatic validation
 *
 * @example
 * ```typescript
 * const getUser = defineRoute({
 *   params: z.object({ id: z.string() }),
 *   response: z.object({
 *     id: z.string(),
 *     name: z.string(),
 *     email: z.string().email(),
 *   }),
 * }, async (req) => {
 *   // req.params.id is automatically typed as string
 *   const user = await getUserById(req.params.id);
 *   // return type is validated against response schema
 *   return { id: user.id, name: user.name, email: user.email };
 * });
 * ```
 */
export function defineRoute<
  TBody extends z.ZodType | undefined = undefined,
  TQuery extends z.ZodType | undefined = undefined,
  TParams extends z.ZodType | undefined = undefined,
  TResponse extends z.ZodType = z.ZodType,
>(
  config: RouteConfig<TBody, TQuery, TParams, TResponse>,
  handler: RouteHandler<
    TBody extends z.ZodType ? Infer<TBody> : never,
    TQuery extends z.ZodType ? Infer<TQuery> : never,
    TParams extends z.ZodType ? Infer<TParams> : never,
    Infer<TResponse>
  >
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body if schema is provided
      let validatedBody: unknown;
      if (config.body) {
        const bodyResult = config.body.safeParse(req.body);
        if (!bodyResult.success) {
          throw new ValidationError("body", bodyResult.error.issues);
        }
        validatedBody = bodyResult.data;
      }

      // Validate query parameters if schema is provided
      let validatedQuery: unknown;
      if (config.query) {
        const queryResult = config.query.safeParse(req.query);
        if (!queryResult.success) {
          throw new ValidationError("query", queryResult.error.issues);
        }
        validatedQuery = queryResult.data;
      }

      // Validate route parameters if schema is provided
      let validatedParams: unknown;
      if (config.params) {
        const paramsResult = config.params.safeParse(req.params);
        if (!paramsResult.success) {
          throw new ValidationError("params", paramsResult.error.issues);
        }
        validatedParams = paramsResult.data;
      }

      // Create typed request object
      const typedRequest: TypedRequest = {
        body: validatedBody,
        query: validatedQuery,
        params: validatedParams,
        raw: req,
      };

      // Execute handler
      const response = await handler(typedRequest as never);

      // Validate response
      const responseResult = config.response.safeParse(response);
      if (!responseResult.success) {
        throw new ValidationError("response", responseResult.error.issues);
      }

      // Wrap response in standardized format
      const wrappedResponse: ApiResponse = {
        data: responseResult.data,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      };

      // Send wrapped response
      res.json(wrappedResponse);
    } catch (error) {
      // Pass validation errors and other errors to Express error handler
      next(error);
    }
  };
}

/**
 * Express error handler middleware for ValidationError
 * Add this to your Express app after all routes
 *
 * @example
 * ```typescript
 * app.use(validationErrorHandler);
 * ```
 */
export function validationErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ValidationError) {
    const wrappedResponse: ApiResponse = {
      data: null,
      error: `Validation Error: Invalid ${err.field}`,
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    };
    res.status(400).json(wrappedResponse);
    return;
  }
  next(err);
}
