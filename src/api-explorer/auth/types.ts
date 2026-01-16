import { InternalAxiosRequestConfig } from "axios";

/**
 * Interface for authentication strategies that provide HTTP headers.
 */
export interface AuthStrategy {
  name: string;
  /**
   * Returns a dictionary of headers to be injected into the request.
   */
  getHeaders(): Record<string, string> | Promise<Record<string, string>>;
}

/**
 * Extension of AuthStrategy that supports dynamic identity changes.
 * Implement this interface if your custom strategy needs impersonation.
 */
export interface IdentifiableStrategy extends AuthStrategy {
  setIdentifier(value: string): void;
  getIdentifier(): string;
}

/**
 * Type guard to check if a strategy supports identifier changes.
 */
export function isIdentifiable(strategy: AuthStrategy): strategy is IdentifiableStrategy {
  return 'setIdentifier' in strategy && 'getIdentifier' in strategy;
}

/**
 * Manages the current authentication state and allows dynamic identifier updates.
 */
export interface AuthContext {
  strategy: AuthStrategy;
  /**
   * Updates the user identifier (e.g. for impersonation).
   * @param value - The new identifier value.
   */
  setIdentifier(value: string): void;
  getIdentifier(): string;
  getHeaders(): Promise<Record<string, string>>;
}

export type RequestHook = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
