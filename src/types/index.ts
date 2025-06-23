/**
 * PrivacyDetective Type Definitions
 * Central location for all TypeScript type definitions
 */

/**
 * Server configuration interface
 */
export interface ServerConfig {
  readonly port: number;
  readonly host: string;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  readonly error: string;
  readonly message: string;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
}

/**
 * API response wrapper for successful operations
 */
export interface ApiResponse<T = unknown> {
  readonly success: true;
  readonly data: T;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * API response wrapper for failed operations
 */
export interface ApiErrorResponse {
  readonly success: false;
  readonly error: ErrorResponse;
}

/**
 * Union type for all API responses
 */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse;

/**
 * Environment variables interface
 */
export interface EnvironmentVariables {
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly PORT: string;
  readonly HOST: string;
  readonly APP_VERSION: string;
  readonly ALLOWED_ORIGINS: string;
}

/**
 * Request context for middleware
 */
export interface RequestContext {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly userAgent?: string;
  readonly ip: string;
}

/**
 * Type guard to check if a value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Type guard to check if an error is an instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Utility type for making all properties of an interface optional except specified keys
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Utility type for making all properties of an interface required except specified keys
 */
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;

/**
 * Utility type for deep readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
