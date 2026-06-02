"use client";

import { useState, useMemo, useCallback } from "react";
import type { Interaction } from "@/src/domain/entities/interaction";
import {
  filterInteractions,
  extractUniqueOriginLines,
  DEFAULT_FILTERS,
} from "@/src/application/use-cases/filter-interactions";
import type { InteractionFilters } from "@/src/application/use-cases/filter-interactions";

interface UseInteractionFiltersResult {
  filters: InteractionFilters;
  setFilter: <K extends keyof InteractionFilters>(
    key: K,
    value: InteractionFilters[K]
  ) => void;
  resetFilters: () => void;
  filteredInteractions: Interaction[];
  visibleCount: number;
  originLines: string[];
}

export function useInteractionFilters(
  interactions: Interaction[]
): UseInteractionFiltersResult {
  const [filters, setFilters] = useState<InteractionFilters>(DEFAULT_FILTERS);

  const filteredInteractions = useMemo(
    () => filterInteractions(interactions, filters),
    [interactions, filters]
  );

  const originLines = useMemo(
    () => extractUniqueOriginLines(interactions),
    [interactions]
  );

  const visibleCount = filteredInteractions.length;

  const setFilter = useCallback(
    <K extends keyof InteractionFilters>(
      key: K,
      value: InteractionFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    setFilter,
    resetFilters,
    filteredInteractions,
    visibleCount,
    originLines,
  };
}
