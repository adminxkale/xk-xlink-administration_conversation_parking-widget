"use client";

import { useState, useEffect, useCallback } from "react";
import type { ManagedAgent } from "@/src/domain/entities/managed-agent";
import { getManagedAgentService } from "@/src/infrastructure/config/service-registry";
import { getManagedAgents } from "@/src/application/use-cases/get-managed-agents";

interface UseManagedAgentsResult {
  agents: ManagedAgent[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useManagedAgents(
  principalAgentId: string | null
): UseManagedAgentsResult {
  const [agents, setAgents] = useState<ManagedAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!principalAgentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = getManagedAgentService();
      const result = await getManagedAgents(service, principalAgentId);

      console.log('[useManagedAgents] Raw API response:', JSON.stringify(result, null, 2));
      console.log('[useManagedAgents] Total agents received:', result.length);
      console.log('[useManagedAgents] Agent IDs:', result.map((a) => a.id));
      console.log('[useManagedAgents] Agents with undefined/null id:', result.filter((a) => a.id == null || a.id === ''));

      // Filter out agents without valid id, then deduplicate
      const valid = result.filter((agent) => agent.id != null && agent.id !== '');
      const unique = valid.filter(
        (agent, index, self) => self.findIndex((a) => a.id === agent.id) === index
      );

      console.log('[useManagedAgents] After filtering/dedup:', unique.length, 'agents');

      setAgents(unique);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los agentes administrados"
      );
    } finally {
      setIsLoading(false);
    }
  }, [principalAgentId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const retry = useCallback(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, isLoading, error, retry };
}
