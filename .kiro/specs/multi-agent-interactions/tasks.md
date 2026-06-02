# Implementation Plan: Multi-Agent Interactions

## Overview

Extender el Conversation Parking Widget para que un agente principal (administrador/supervisor) pueda visualizar y gestionar las interacciones de todos los agentes bajo su administración. Se implementa siguiendo la arquitectura hexagonal existente: nueva entidad de dominio, puerto, servicio de infraestructura, use cases, hooks y componentes de UI con filtrado avanzado.

## Tasks

- [x] 1. Domain layer — entidad y puerto para agentes administrados
  - [x] 1.1 Create `ManagedAgent` entity and `ManagedAgentService` port
    - Create `src/domain/entities/managed-agent.ts` with the `ManagedAgent` interface (`id: string`, `name: string`)
    - Create `src/domain/ports/managed-agent-service.port.ts` with the `ManagedAgentService` interface defining `getManagedAgents(principalAgentId: string): Promise<ManagedAgent[]>`
    - _Requirements: 1.1, 1.5, 9.5_

- [x] 2. Infrastructure layer — proxy route and service implementation
  - [x] 2.1 Create `/api/proxy-managed-agents` Next.js route
    - Create `app/api/proxy-managed-agents/route.ts`
    - Implement GET handler that reads `principal_agent_id` from query params
    - Return 400 if `principal_agent_id` is missing with descriptive error message
    - Forward request to external Managed_Agents_API with Basic Auth server-side (same pattern as `proxy-interactions`)
    - Return 502 on external API failure, 200 with `ManagedAgent[]` on success
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 2.2 Create `RealManagedAgentService` infrastructure service
    - Create `src/infrastructure/services/real-managed-agent.service.ts`
    - Implement `ManagedAgentService` port by calling `/api/proxy-managed-agents?principal_agent_id=...`
    - Throw descriptive error on non-OK responses
    - _Requirements: 1.1, 1.4_

  - [x] 2.3 Register `ManagedAgentService` in the service registry
    - Extend `src/infrastructure/config/service-registry.ts` to instantiate `RealManagedAgentService` and export `getManagedAgentService()` getter
    - _Requirements: 1.1_

- [x] 3. Application layer — use cases
  - [x] 3.1 Implement `getManagedAgents` use case
    - Create `src/application/use-cases/get-managed-agents.ts`
    - Pure function that delegates to `ManagedAgentService.getManagedAgents(principalAgentId)`
    - _Requirements: 1.1_

  - [x] 3.2 Implement `getMultiAgentInteractions` use case
    - Create `src/application/use-cases/get-multi-agent-interactions.ts`
    - Export `MultiAgentResult` interface (`interactions: Interaction[]`, `failedAgentIds: string[]`)
    - Use `Promise.allSettled` to query interactions for each agent in parallel
    - Enrich each interaction with `agentId` and `agentName` from the corresponding `ManagedAgent` if not already present
    - Sort combined results by `startTimestamp` descending
    - Collect failed agent IDs separately
    - _Requirements: 2.1, 2.2, 2.3, 3.3_

  - [x] 3.3 Implement `filterInteractions` use case
    - Create `src/application/use-cases/filter-interactions.ts`
    - Export `InteractionFilters` interface and `DEFAULT_FILTERS` constant
    - Implement conjunctive (AND) filtering: agentId, parkingStatus, originLine, searchText (case-insensitive on clientName and destinationLine)
    - Export helper `extractUniqueOriginLines(interactions): string[]`
    - _Requirements: 4.2, 4.3, 5.2, 5.3, 6.2, 7.2, 7.3, 8.1_

  - [ ]* 3.4 Write property tests for `filterInteractions`
    - Create `__tests__/application/filter-interactions.property.test.ts`
    - **Property 4: Agent filter returns only matching interactions**
    - **Property 5: Parking status filter correctness**
    - **Property 6: Origin line filter returns only matching interactions**
    - **Property 7: Text search matches clientName or destinationLine case-insensitively**
    - **Property 8: Conjunctive filter composition (AND logic)**
    - **Property 9: Unique origin lines extraction**
    - **Validates: Requirements 4.2, 4.3, 5.2, 5.3, 6.2, 7.2, 7.3, 8.1, 6.1**

  - [ ]* 3.5 Write property tests for `getMultiAgentInteractions`
    - Create `__tests__/application/get-multi-agent-interactions.property.test.ts`
    - **Property 1: Combined interactions are sorted by timestamp descending**
    - **Property 2: Partial failure preserves successful results**
    - **Property 3: Agent name enrichment from API**
    - **Validates: Requirements 2.2, 2.3, 3.3**

  - [ ]* 3.6 Write unit tests for use cases
    - Create `src/application/use-cases/get-managed-agents.test.ts` — test success and error cases
    - Create `src/application/use-cases/get-multi-agent-interactions.test.ts` — test full success, full failure, partial failure
    - Create `src/application/use-cases/filter-interactions.test.ts` — test each filter individually, empty list, missing clientName edge case
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 4.2, 5.2, 6.2, 7.2, 8.1, 8.2_

- [x] 4. Checkpoint — Domain, infrastructure, and use cases
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Application layer — hooks
  - [x] 5.1 Implement `useManagedAgents` hook
    - Create `src/application/hooks/useManagedAgents.ts`
    - Invoke `getManagedAgents` on mount when `principalAgentId` is available
    - Expose: `agents: ManagedAgent[]`, `isLoading: boolean`, `error: string | null`, `retry: () => void`
    - Handle empty response (agents = []) and error states
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 5.2 Implement `useMultiAgentInteractions` hook
    - Create `src/application/hooks/useMultiAgentInteractions.ts`
    - Depend on `useManagedAgents` to get agent list
    - Invoke `getMultiAgentInteractions` when agents are available
    - Show toast warning if some agents failed (using existing toast system)
    - Expose: `interactions: Interaction[]`, `isLoading: boolean`, `error: string | null`, `failedCount: number`, `refresh: () => void`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.3 Implement `useInteractionFilters` hook
    - Create `src/application/hooks/useInteractionFilters.ts`
    - Maintain filter state (`InteractionFilters`) with `DEFAULT_FILTERS` as initial value
    - Apply `filterInteractions` on the interactions list
    - Extract unique origin lines from unfiltered interactions
    - Expose: `filters`, `setFilter(key, value)`, `resetFilters()`, `filteredInteractions`, `visibleCount`, `originLines`
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

  - [ ]* 5.4 Write unit tests for hooks
    - Create `src/application/hooks/useManagedAgents.test.ts` — test loading, success, error, retry states
    - Create `src/application/hooks/useMultiAgentInteractions.test.ts` — test integration with useManagedAgents, partial failure toast
    - Create `src/application/hooks/useInteractionFilters.test.ts` — test filter application, reset, visible count
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 4.2, 5.2, 8.1_

- [x] 6. Presentation layer — UI components
  - [x] 6.1 Create `FilterPanel` component
    - Create `src/presentation/components/FilterPanel.tsx` with `"use client"` directive
    - Implement agent selector dropdown (list of managed agents + "Todos los agentes" option)
    - Implement parking status selector ("Todas", "Parqueadas", "Activas")
    - Implement origin line selector (unique lines + "Todas las líneas" option)
    - Implement text search input with placeholder "Buscar por cliente o número..."
    - Implement "Limpiar filtros" button
    - Display visible interaction count badge
    - Follow Tailwind design system (inputs with `min-h-[44px]`, focus rings, labels)
    - _Requirements: 4.1, 5.1, 5.4, 6.1, 7.1, 8.2, 8.3_

  - [x] 6.2 Extend `InteractionCard` to display agent name
    - Modify existing `InteractionCard` component to show `agentName` prominently
    - Display "Agente desconocido" when `agentName` is undefined or empty
    - _Requirements: 3.1, 3.2_

  - [ ]* 6.3 Write unit tests for presentation components
    - Create `__tests__/presentation/filter-panel.test.tsx` — test rendering of all filter controls, user interactions, reset button
    - Create `__tests__/presentation/interaction-card-agent.test.tsx` — test agent name display, "Agente desconocido" fallback
    - _Requirements: 3.1, 3.2, 4.1, 5.1, 6.1, 7.1, 8.3_

- [x] 7. Checkpoint — Hooks and UI components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integration and wiring
  - [x] 8.1 Wire multi-agent view into the main widget page
    - Modify `app/page.tsx` (or the relevant widget container) to integrate `useManagedAgents`, `useMultiAgentInteractions`, and `useInteractionFilters` hooks
    - Render `FilterPanel` above the interaction list when in multi-agent mode
    - Pass filtered interactions to the existing `InteractionList` component
    - Show error state with retry button when managed agents fetch fails
    - Show empty state when no managed agents are found
    - Show skeleton loader while interactions are loading
    - Wire refresh button to re-query all interactions
    - _Requirements: 1.2, 1.3, 2.3, 2.4, 2.5, 5.4, 8.2_

  - [ ]* 8.2 Write integration tests
    - Create `__tests__/integration/multi-agent-interactions.test.tsx` — test full flow from auth → managed agents → interactions → filtering using MSW mocks
    - _Requirements: 1.1, 2.1, 2.2, 4.2, 5.2, 8.1_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (9 properties total)
- Unit tests validate specific examples and edge cases
- All proxy routes follow the existing pattern in `proxy-interactions/route.ts` (Basic Auth server-side, error handling)
- The `filterInteractions` use case is a pure function — ideal for property-based testing with fast-check
- MSW is used for mocking HTTP calls in hook and integration tests
- UI texts are in Spanish per project conventions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.3"] },
    { "id": 2, "tasks": ["2.3", "3.2"] },
    { "id": 3, "tasks": ["3.4", "3.5", "3.6"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4", "6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2"] }
  ]
}
```
