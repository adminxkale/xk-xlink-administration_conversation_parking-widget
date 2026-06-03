"use client";

import { useMemo } from "react";
import { useAuthContext } from "../providers/AuthContext";
import { useToastContext } from "../providers/ToastContext";
import { useQueueNames } from "../../application/hooks/useQueueNames";
import { useManagedAgents } from "../../application/hooks/useManagedAgents";
import { useMultiAgentInteractions } from "../../application/hooks/useMultiAgentInteractions";
import { useInteractionFilters } from "../../application/hooks/useInteractionFilters";
import { Header } from "./Header";
import { FilterPanel } from "./FilterPanel";
import { InteractionList } from "./InteractionList";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorMessage } from "./ErrorMessage";
import { ToastProvider } from "./ToastProvider";

function ConversationParkingWidgetInner() {
  const { addToast } = useToastContext();
  const { agent, token, tenantId } = useAuthContext();

  // Multi-agent hooks
  const {
    agents,
    isLoading: agentsLoading,
    error: agentsError,
    retry: retryAgents,
  } = useManagedAgents(agent?.id ?? null, tenantId);

  const {
    interactions,
    isLoading: interactionsLoading,
    error: interactionsError,
    refresh,
  } = useMultiAgentInteractions(agent?.id ?? null, addToast, tenantId);

  const {
    filters,
    setFilter,
    resetFilters,
    filteredInteractions,
    visibleCount,
    originLines,
  } = useInteractionFilters(interactions);

  const queueIds = useMemo(
    () => filteredInteractions.map((i) => i.queueId).filter((id): id is string => !!id),
    [filteredInteractions]
  );
  const queueNames = useQueueNames(queueIds, token);

  const isLoading = agentsLoading || interactionsLoading;

  // Show error state when managed agents fetch fails
  if (agentsError && !agentsLoading) {
    return (
      <div className="relative flex flex-col h-full bg-white">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <ErrorMessage message={agentsError} onRetry={retryAgents} />
        </div>
      </div>
    );
  }

  // Show empty state when no managed agents are found (after loading completes)
  if (!agentsLoading && !agentsError && agents.length === 0 && agent?.id) {
    return (
      <div className="relative flex flex-col h-full bg-white">
        <Header />
        <div className="flex flex-col items-center gap-3 p-8 text-gray-500">
          <p>No se encontraron agentes administrados</p>
          <button
            type="button"
            onClick={retryAgents}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[44px] min-h-[44px]"
            aria-label="Reintentar"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Show skeleton loader while agents are loading
  if (agentsLoading) {
    return (
      <div className="relative flex flex-col h-full bg-white">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-white">
      <Header />
      <FilterPanel
        agents={agents}
        principalAgentId={agent?.id ?? null}
        originLines={originLines}
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        visibleCount={visibleCount}
      />
      <div className="flex-1 overflow-y-auto">
        <InteractionList
          interactions={filteredInteractions}
          isLoading={interactionsLoading}
          error={interactionsError}
          onRetry={refresh}
          queueNames={queueNames}
        />
      </div>

      {/* Floating refresh button */}
      <button
        type="button"
        onClick={refresh}
        disabled={isLoading}
        className="fixed bottom-4 right-4 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Actualizar interacciones"
        title="Actualizar interacciones"
      >
        <svg
          className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}

export function ConversationParkingWidget() {
  return (
    <ToastProvider>
      <ConversationParkingWidgetInner />
    </ToastProvider>
  );
}
