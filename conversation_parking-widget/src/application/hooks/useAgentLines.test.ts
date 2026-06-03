import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAgentLines } from "./useAgentLines";
import type { Line } from "../../domain/entities/line";

vi.mock("../../infrastructure/adapters/lines.adapter", () => ({
  fetchGroupPhones: vi.fn(),
  fetchChannels: vi.fn(),
}));

import {
  fetchGroupPhones,
  fetchChannels,
} from "../../infrastructure/adapters/lines.adapter";

const mockFetchGroupPhones = vi.mocked(fetchGroupPhones);
const mockFetchChannels = vi.mocked(fetchChannels);

const lineA: Line = {
  id: "l1",
  number: "Line A",
  phone_number_id: "pn1",
  phone_number: "+1111",
  groups: ["g1"],
};

const lineB: Line = {
  id: "l2",
  number: "Line B",
  phone_number_id: "pn2",
  phone_number: "+2222",
  groups: ["g2"],
};

const TEST_TENANT = 'test-tenant';

describe("useAgentLines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays in loading state when agentGroupIds is null", () => {
    const { result } = renderHook(() => useAgentLines(null, TEST_TENANT));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.lines).toEqual([]);
    expect(result.current.selectedLineId).toBeNull();
  });

  it("stays in loading state when tenant is not provided", () => {
    const { result } = renderHook(() => useAgentLines(["g1"], null));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.lines).toEqual([]);
  });

  it("fetches group phones with tenant parameter", async () => {
    mockFetchGroupPhones.mockImplementation((gid: string) =>
      Promise.resolve(gid === "g1" ? [lineA] : [lineB])
    );

    const { result } = renderHook(() => useAgentLines(["g1", "g2"], TEST_TENANT));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchGroupPhones).toHaveBeenCalledWith("g1", TEST_TENANT);
    expect(mockFetchGroupPhones).toHaveBeenCalledWith("g2", TEST_TENANT);
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it("falls back to fetchChannels when agentGroupIds is empty", async () => {
    mockFetchChannels.mockResolvedValue([lineA]);

    const { result } = renderHook(() => useAgentLines([], TEST_TENANT));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchChannels).toHaveBeenCalled();
    expect(mockFetchGroupPhones).not.toHaveBeenCalled();
    expect(result.current.lines).toEqual([lineA]);
  });

  it("sets error when fetch fails", async () => {
    mockFetchGroupPhones.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAgentLines(["g1"], TEST_TENANT));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      "No se pudieron cargar las líneas: todos los grupos fallaron"
    );
    expect(result.current.lines).toEqual([]);
  });

  it("allows changing selected line via setSelectedLineId", async () => {
    mockFetchGroupPhones.mockResolvedValue([lineA, lineB]);

    const { result } = renderHook(() => useAgentLines(["g1"], TEST_TENANT));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSelectedLineId("l2");
    });

    expect(result.current.selectedLineId).toBe("l2");
  });
});
