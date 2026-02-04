import type { ApiResponse } from "@router402/types";
import { logger, validationErrorHandler } from "@router402/utils";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { initConfig } from "./config/index.js";
import { chatRouter } from "./routes/chat.js";
import { healthRouter } from "./routes/health.js";

// Initialize and validate configuration at startup
const config = initConfig();

const app = express();
const PORT = config.PORT;
const CORS_ORIGIN = config.CORS_ORIGIN;

// Middleware stack
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// Request logging middleware
const httpLogger = logger.context("HTTP");
app.use((req: Request, _res: Response, next: NextFunction) => {
  httpLogger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/health", healthRouter);
app.use("/v1/chat/completions", chatRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  const response: ApiResponse = {
    data: null,
    error: "Not Found: The requested resource was not found",
    meta: {
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };
  res.status(404).json(response);
});

// Validation error handler (must be before global error handler)
app.use(validationErrorHandler);

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", err);
  const response: ApiResponse = {
    data: null,
    error: `Internal Server Error: ${err.message || "An unexpected error occurred"}`,
    meta: {
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };
  res.status(500).json(response);
});

// Start server
const serverLogger = logger.context("Server");
const server = app.listen(PORT, () => {
  serverLogger.info(`Server running on http://localhost:${PORT}`);
  serverLogger.info(`Environment: ${config.NODE_ENV}`);
  serverLogger.info(`CORS enabled for: ${CORS_ORIGIN}`);
});

// Graceful shutdown
const shutdownLogger = logger.context("Shutdown");
process.on("SIGTERM", () => {
  shutdownLogger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    shutdownLogger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  shutdownLogger.info("\nSIGINT signal received: closing HTTP server");
  server.close(() => {
    shutdownLogger.info("HTTP server closed");
    process.exit(0);
  });
});
