import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import axios from "axios";
import { ApiExecutor } from "../../src/api-explorer/api-executor.js";
import { BearerStrategy } from "../../src/api-explorer/auth/strategies/bearer-strategy.js";
import { GlobalAuthContext } from "../../src/api-explorer/auth/auth-context.js";

describe("ApiExecutor", () => {
  let executor: ApiExecutor;
  let mockClient: any;
  let authContext: GlobalAuthContext;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
      },
    };
    jest.spyOn(axios, 'create').mockReturnValue(mockClient as any);
    
    authContext = new GlobalAuthContext(new BearerStrategy("test-token"));
    executor = new ApiExecutor("http://api.test", authContext);
  });

  it("should substitute path parameters correctly", async () => {
    mockClient.request.mockResolvedValue({ status: 200, statusText: "OK", data: { success: true } });

    await executor.callEndpoint({
      method: "GET",
      path: "/users/{id}/details",
      parameters: { id: 123 },
    });

    expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
      url: "/users/123/details",
    }));
  });

  it("should handle query parameters correctly", async () => {
    mockClient.request.mockResolvedValue({ status: 200, statusText: "OK", data: { success: true } });

    await executor.callEndpoint({
      method: "GET",
      path: "/users",
      parameters: { limit: 10, offset: 0 },
    });

    expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
      params: { limit: 10, offset: 0 },
    }));
  });

  it("should pass the request body correctly", async () => {
    mockClient.request.mockResolvedValue({ status: 201, statusText: "Created", data: { id: 1 } });

    const body = { name: "Test User" };
    await executor.callEndpoint({
      method: "POST",
      path: "/users",
      body,
    });

    expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
      data: body,
    }));
  });

  it("should handle error responses gracefully", async () => {
    mockClient.request.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
        statusText: "Not Found",
        data: { error: "User not found" },
      },
      message: "Request failed with status code 404",
    });

    // We need to mock axios.isAxiosError as well since it's used in catch
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const result = await executor.callEndpoint({
      method: "GET",
      path: "/users/999",
    });

    expect(result).toEqual(expect.objectContaining({
      error: true,
      status: 404,
      data: { error: "User not found" },
    }));
  });
});
