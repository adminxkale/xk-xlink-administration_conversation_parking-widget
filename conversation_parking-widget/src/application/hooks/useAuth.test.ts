import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuth } from "./useAuth";
import type { GenesysCredentials } from "../../domain/entities/tenant";

// Mock the genesys-auth adapter
vi.mock("../../infrastructure/adapters/genesys-auth.adapter", () => ({
  loginWithPKCE: vi.fn(),
  clearToken: vi.fn(),
}));

import {
  loginWithPKCE,
  clearToken,
} from "../../infrastructure/adapters/genesys-auth.adapter";

const mockLoginWithPKCE = vi.mocked(loginWithPKCE);
const mockClearToken = vi.mocked(clearToken);

const fakeCredentials: GenesysCredentials = {
  genesys_client_id: 'test-client-id',
  genesys_client_secret: 'test-secret',
  environment: 'mypurecloud.com',
};

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays in loading state when credentials is null", () => {
    const { result } = renderHook(() => useAuth(null));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("authenticates successfully when loginWithPKCE resolves", async () => {
    mockLoginWithPKCE.mockResolvedValue({
      name: "Agent Smith",
      id: "agent-123",
      groupIds: ["group-a", "group-b"],
      token: "valid-pkce-token",
    });

    const { result } = renderHook(() => useAuth(fakeCredentials));

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.token).toBe("valid-pkce-token");
    expect(result.current.agent).toEqual({ name: "Agent Smith", id: "agent-123" });
    expect(result.current.agentGroupIds).toEqual(["group-a", "group-b"]);
    expect(result.current.error).toBeNull();
    expect(mockLoginWithPKCE).toHaveBeenCalledWith("test-client-id", "mypurecloud.com");
  });

  it("clears token and shows error when loginWithPKCE rejects", async () => {
    mockLoginWithPKCE.mockRejectedValue(new Error("Token exchange failed (400): invalid_grant"));

    const { result } = renderHook(() => useAuth(fakeCredentials));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBe("Token exchange failed (400): invalid_grant");
    expect(mockClearToken).toHaveBeenCalled();
  });

  it("sets generic error message for non-Error thrown values", async () => {
    mockLoginWithPKCE.mockRejectedValue("unexpected");

    const { result } = renderHook(() => useAuth(fakeCredentials));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Authentication failed");
  });

  it("does not redirect — loginWithPKCE handles the full flow internally", async () => {
    // When PKCE needs to redirect, the promise never resolves (page navigates away).
    // In tests, we simulate this by having the promise hang indefinitely.
    mockLoginWithPKCE.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(fakeCredentials));

    // State stays in loading since the promise never resolves
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
