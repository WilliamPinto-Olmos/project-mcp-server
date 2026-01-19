import axios, { AxiosInstance, Method, InternalAxiosRequestConfig } from "axios";
import { AuthContext, createAuthContextFromEnv, runRequestHooks } from "./auth/index.js";

export interface CallEndpointArgs {
  method: string;
  path: string;
  parameters?: Record<string, any>;
  body?: any;
}

/**
 * Handles the actual HTTP communication with the API.
 * Uses axios interceptors to dynamically inject authentication headers and run request hooks.
 */
export class ApiExecutor {
  private client: AxiosInstance;
  private authContext: AuthContext;

  /**
   * @param baseURL - The target API base URL. Defaults to env.PROJECT_MCP_API_BASE_URL.
   * @param authContext - The AuthContext managing the current authentication strategy.
   */
  constructor(baseURL?: string, authContext?: AuthContext) {
    const finalBaseURL = baseURL || process.env.PROJECT_MCP_API_BASE_URL || "http://localhost:5000";
    this.authContext = authContext || createAuthContextFromEnv();

    this.client = axios.create({
      baseURL: finalBaseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add interceptor for dynamic auth and hooks
    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const authHeaders = await this.authContext.getHeaders();
      
      // Log for debugging (stderr)
      if (Object.keys(authHeaders).length > 0) {
        console.error(`[ApiExecutor] Injecting auth headers from strategy: ${this.authContext.strategy.name}`);
      }

      Object.assign(config.headers, authHeaders);

      return await runRequestHooks(config);
    });
  }

  /**
   * Executes an API request based on the provided meta-tool arguments.
   * Handles path parameter substitution and query parameter mapping.
   * @param args - The method, path, and optional parameters/body.
   */
  async callEndpoint(args: CallEndpointArgs) {
    const { method, path, parameters, body } = args;
    
    let renderedPath = path;
    const queryParams: Record<string, any> = {};

    if (parameters) {
      Object.entries(parameters).forEach(([name, value]) => {
        const placeholder = `{${name}}`;
        if (renderedPath.includes(placeholder)) {
          renderedPath = renderedPath.replace(placeholder, String(value));
        } else {
          queryParams[name] = value;
        }
      });
    }

    try {
      const response = await this.client.request({
        method: method.toUpperCase() as Method,
        url: renderedPath,
        params: queryParams,
        data: body,
      });

      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        return {
          error: true,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        };
      }
      throw error;
    }
  }

  getAuthContext(): AuthContext {
    return this.authContext;
  }
}
