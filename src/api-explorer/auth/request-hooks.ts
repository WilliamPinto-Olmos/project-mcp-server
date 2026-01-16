import { RequestHook } from "./types.js";
import { InternalAxiosRequestConfig } from "axios";

const hooks: RequestHook[] = [];

/**
 * Registers a new hook to be run before every outgoing API request.
 * Hooks can be used to log, trace, or modify the request configuration.
 */
export function addRequestHook(hook: RequestHook) {
  hooks.push(hook);
}

/**
 * Executes all registered request hooks in the order they were added.
 * @param config - The axios request configuration.
 */
export async function runRequestHooks(
  config: InternalAxiosRequestConfig
): Promise<InternalAxiosRequestConfig> {
  let currentConfig = config;
  for (const hook of hooks) {
    currentConfig = await hook(currentConfig);
  }
  return currentConfig;
}

/**
 * Removes all registered request hooks. Useful for testing or resets.
 */
export function clearRequestHooks() {
  hooks.length = 0;
}
