import { Logger } from "@router402/utils";

/**
 * Pre-configured logger instances for common frontend use cases
 * Use these instead of console.log throughout the application
 */

/**
 * Logger for API calls and network requests
 * @example
 * apiLogger.info('Fetching user data', { userId: 123 });
 * apiLogger.error('API call failed', { error: err.message });
 */
export const apiLogger = new Logger("frontend:api");

/**
 * Logger for UI interactions and component lifecycle
 * @example
 * uiLogger.debug('Component mounted', { componentName: 'Header' });
 * uiLogger.warn('Deprecated prop used', { prop: 'oldProp' });
 */
export const uiLogger = new Logger("frontend:ui");

/**
 * Logger for configuration and initialization
 * @example
 * configLogger.info('App initialized', { env: process.env.NODE_ENV });
 * configLogger.error('Invalid config', { config });
 */
export const configLogger = new Logger("frontend:config");

/**
 * Logger for state management operations
 * @example
 * stateLogger.debug('State updated', { action: 'SET_USER', payload });
 */
export const stateLogger = new Logger("frontend:state");

/**
 * Logger for routing and navigation
 * @example
 * routeLogger.info('Route changed', { from: '/home', to: '/profile' });
 */
export const routeLogger = new Logger("frontend:route");

/**
 * Export the Logger class for creating custom logger instances
 * @example
 * const customLogger = new Logger('frontend:custom-feature');
 */
export { Logger };
