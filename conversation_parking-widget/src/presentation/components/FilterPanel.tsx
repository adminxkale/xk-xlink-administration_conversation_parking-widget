"use client";

import { useState } from 'react';
import type { ManagedAgent } from '@/src/domain/entities/managed-agent';
import type { InteractionFilters } from '@/src/application/use-cases/filter-interactions';

interface FilterPanelProps {
  agents: ManagedAgent[];
  principalAgentId: string | null;
  originLines: string[];
  filters: InteractionFilters;
  onFilterChange: <K extends keyof InteractionFilters>(key: K, value: InteractionFilters[K]) => void;
  onReset: () => void;
  visibleCount: number;
}

export function FilterPanel({
  agents,
  principalAgentId,
  originLines,
  filters,
  onFilterChange,
  onReset,
  visibleCount,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.agentId !== null ||
    filters.originLine !== null ||
    filters.searchText.trim() !== '';

  const activeFilterCount = [
    filters.agentId !== null,
    filters.originLine !== null,
    filters.searchText.trim() !== '',
  ].filter(Boolean).length;

  // Separate principal agent from managed agents
  const principalAgent = agents.find((a) => a.id === principalAgentId);
  const otherAgents = agents.filter((a) => a.id !== principalAgentId);

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 min-h-[44px] hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls="filter-panel-content"
        aria-label={isExpanded ? 'Colapsar filtros' : 'Expandir filtros'}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Filtros</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {visibleCount} {visibleCount === 1 ? 'interacción' : 'interacciones'}
        </span>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div id="filter-panel-content" className="p-3 pt-0 space-y-3">
          {/* Search - full width on top */}
          <div>
            <label htmlFor="filter-search" className="text-sm font-medium text-gray-700">
              Buscar
            </label>
            <input
              id="filter-search"
              type="text"
              value={filters.searchText}
              onChange={(e) => onFilterChange('searchText', e.target.value)}
              placeholder="Buscar por cliente o número..."
              className="w-full p-2 text-sm border rounded-lg bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              aria-label="Buscar por cliente o número"
            />
          </div>

          {/* Selects side by side */}
          <div className="grid grid-cols-2 gap-2">
            {/* Agent selector */}
            <div>
              <label htmlFor="filter-agent" className="text-sm font-medium text-gray-700">
                Agente
              </label>
              <select
                id="filter-agent"
                value={filters.agentId ?? ''}
                onChange={(e) => onFilterChange('agentId', e.target.value || null)}
                className="w-full p-2 text-sm border rounded-lg bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                aria-label="Filtrar por agente"
              >
                <option value="">Todos los agentes</option>
                {principalAgent && (
                  <option key={principalAgent.id} value={principalAgent.id}>
                    {principalAgent.name} (Yo)
                  </option>
                )}
                {otherAgents.map((agent, index) => (
                  <option key={agent.id ?? `agent-${index}`} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Origin line selector */}
            <div>
              <label htmlFor="filter-origin-line" className="text-sm font-medium text-gray-700">
                Línea de origen
              </label>
              <select
                id="filter-origin-line"
                value={filters.originLine ?? ''}
                onChange={(e) => onFilterChange('originLine', e.target.value || null)}
                className="w-full p-2 text-sm border rounded-lg bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                aria-label="Filtrar por línea de origen"
              >
                <option value="">Todas las líneas</option>
                {originLines.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[44px] min-h-[44px]"
                aria-label="Limpiar todos los filtros"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
