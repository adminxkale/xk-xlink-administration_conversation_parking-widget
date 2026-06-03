"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Interaction } from "@/src/domain/entities/interaction";
import type { ToastType } from "@/src/domain/entities/toast";
import { getInteractionService } from "@/src/infrastructure/config/service-registry";
import { getMultiAgentInteractions } from "@/src/application/use-cases/get-multi-agent-interactions";
import { useManagedAgents } from "@/src/application/hooks/useManagedAgents";

interface UseMultiAgentInteractionsResult {
  interactions: Interaction[];
  isLoading: boolean;
  error: string | null;
  failedCount: number;
  refresh: () => void;
}

export function useMultiAgentInteractions(
  principalAgentId: string | null,
  addToast?: (params: { type: ToastType; message: string }) => void,
  tenant?: string | null
): UseMultiAgentInteractionsResult {
  const { agents, isLoading: agentsLoading, error: agentsError } = useManagedAgents(principalAgentId, tenant);

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const fetchInteractions = useCallback(async () => {
    if (agents.length === 0 || !tenant) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = getInteractionService();
      const result = await getMultiAgentInteractions(service, agents, tenant);

      setInteractions(result.interactions);
      setFailedCount(result.failedAgentIds.length);

      if (result.failedAgentIds.length > 0) {
        const message = `No se pudieron cargar las interacciones de ${result.failedAgentIds.length} agente(s)`;
        addToastRef.current?.({ type: "error", message });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las interacciones"
      );
    } finally {
      setIsLoading(false);
    }
  }, [agents, tenant]);

  useEffect(() => {
    if (agents.length > 0 && tenant) {
      fetchInteractions();
    }
  }, [agents, tenant, fetchInteractions]);

  const refresh = useCallback(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const combinedLoading = agentsLoading || isLoading;
  const combinedError = agentsError || error;

  return {
    interactions,
    isLoading: combinedLoading,
    error: combinedError,
    failedCount,
    refresh,
  };
}
