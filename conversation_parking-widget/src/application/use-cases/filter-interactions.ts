import { Interaction } from '@/src/domain/entities/interaction';

export interface InteractionFilters {
  agentId: string | null;       // null = todos
  parkingStatus: 'all' | 'parked' | 'active';
  originLine: string | null;    // null = todas
  searchText: string;           // '' = sin filtro
}

export const DEFAULT_FILTERS: InteractionFilters = {
  agentId: null,
  parkingStatus: 'all',
  originLine: null,
  searchText: '',
};

export function filterInteractions(
  interactions: Interaction[],
  filters: InteractionFilters
): Interaction[] {
  return interactions.filter((interaction) => {
    if (filters.agentId && interaction.agentId !== filters.agentId) return false;
    if (filters.parkingStatus === 'parked' && !interaction.isParked) return false;
    if (filters.parkingStatus === 'active' && interaction.isParked) return false;
    if (filters.originLine && interaction.originLine !== filters.originLine) return false;
    if (filters.searchText.trim()) {
      const search = filters.searchText.toLowerCase();
      const matchesClient = interaction.clientName?.toLowerCase().includes(search) ?? false;
      const matchesDestination = interaction.destinationLine.toLowerCase().includes(search);
      if (!matchesClient && !matchesDestination) return false;
    }
    return true;
  });
}

export function extractUniqueOriginLines(interactions: Interaction[]): string[] {
  return [...new Set(interactions.map((i) => i.originLine))];
}
