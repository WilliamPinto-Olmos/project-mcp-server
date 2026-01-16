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
