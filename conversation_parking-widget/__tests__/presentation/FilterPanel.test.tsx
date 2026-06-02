import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPanel } from '../../src/presentation/components/FilterPanel';
import type { ManagedAgent } from '../../src/domain/entities/managed-agent';
import type { InteractionFilters } from '../../src/application/use-cases/filter-interactions';
import { DEFAULT_FILTERS } from '../../src/application/use-cases/filter-interactions';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockAgents: ManagedAgent[] = [
  { id: 'agent-1', name: 'Carlos Pérez' },
  { id: 'agent-2', name: 'María López' },
];

const mockOriginLines = ['+573001111111', '+573002222222'];

function renderFilterPanel(overrides: Partial<{
  agents: ManagedAgent[];
  originLines: string[];
  filters: InteractionFilters;
  onFilterChange: <K extends keyof InteractionFilters>(key: K, value: InteractionFilters[K]) => void;
  onReset: () => void;
  visibleCount: number;
}> = {}) {
  const defaultProps = {
    agents: mockAgents,
    originLines: mockOriginLines,
    filters: DEFAULT_FILTERS,
    onFilterChange: vi.fn(),
    onReset: vi.fn(),
    visibleCount: 5,
    ...overrides,
  };
  return { ...render(<FilterPanel {...defaultProps} />), props: defaultProps };
}

describe('FilterPanel', () => {
  it('renders agent selector with "Todos los agentes" and managed agents', () => {
    renderFilterPanel();
    const select = screen.getByLabelText('Filtrar por agente');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Todos los agentes')).toBeInTheDocument();
    expect(screen.getByText('Carlos Pérez')).toBeInTheDocument();
    expect(screen.getByText('María López')).toBeInTheDocument();
  });

  it('renders parking status selector with correct options', () => {
    renderFilterPanel();
    const select = screen.getByLabelText('Filtrar por estado de parqueo');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Todas')).toBeInTheDocument();
    expect(screen.getByText('Parqueadas')).toBeInTheDocument();
    expect(screen.getByText('Activas')).toBeInTheDocument();
  });

  it('renders origin line selector with "Todas las líneas" and unique lines', () => {
    renderFilterPanel();
    const select = screen.getByLabelText('Filtrar por línea de origen');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Todas las líneas')).toBeInTheDocument();
    expect(screen.getByText('+573001111111')).toBeInTheDocument();
    expect(screen.getByText('+573002222222')).toBeInTheDocument();
  });

  it('renders text search input with correct placeholder', () => {
    renderFilterPanel();
    const input = screen.getByPlaceholderText('Buscar por cliente o número...');
    expect(input).toBeInTheDocument();
  });

  it('displays visible interaction count badge', () => {
    renderFilterPanel({ visibleCount: 12 });
    expect(screen.getByText('12 interacciones')).toBeInTheDocument();
  });

  it('displays singular form for count of 1', () => {
    renderFilterPanel({ visibleCount: 1 });
    expect(screen.getByText('1 interacción')).toBeInTheDocument();
  });

  it('shows "Limpiar filtros" button when filters are active', () => {
    renderFilterPanel({
      filters: { ...DEFAULT_FILTERS, agentId: 'agent-1' },
    });
    expect(screen.getByRole('button', { name: /limpiar todos los filtros/i })).toBeInTheDocument();
  });

  it('hides "Limpiar filtros" button when no filters are active', () => {
    renderFilterPanel({ filters: DEFAULT_FILTERS });
    expect(screen.queryByRole('button', { name: /limpiar todos los filtros/i })).not.toBeInTheDocument();
  });

  it('calls onFilterChange when agent is selected', async () => {
    const user = userEvent.setup();
    const { props } = renderFilterPanel();
    const select = screen.getByLabelText('Filtrar por agente');
    await user.selectOptions(select, 'agent-1');
    expect(props.onFilterChange).toHaveBeenCalledWith('agentId', 'agent-1');
  });

  it('calls onFilterChange with null when "Todos los agentes" is selected', async () => {
    const user = userEvent.setup();
    const { props } = renderFilterPanel({
      filters: { ...DEFAULT_FILTERS, agentId: 'agent-1' },
    });
    const select = screen.getByLabelText('Filtrar por agente');
    await user.selectOptions(select, '');
    expect(props.onFilterChange).toHaveBeenCalledWith('agentId', null);
  });

  it('calls onFilterChange when parking status is changed', async () => {
    const user = userEvent.setup();
    const { props } = renderFilterPanel();
    const select = screen.getByLabelText('Filtrar por estado de parqueo');
    await user.selectOptions(select, 'parked');
    expect(props.onFilterChange).toHaveBeenCalledWith('parkingStatus', 'parked');
  });

  it('calls onFilterChange when origin line is selected', async () => {
    const user = userEvent.setup();
    const { props } = renderFilterPanel();
    const select = screen.getByLabelText('Filtrar por línea de origen');
    await user.selectOptions(select, '+573001111111');
    expect(props.onFilterChange).toHaveBeenCalledWith('originLine', '+573001111111');
  });

  it('calls onFilterChange when text is typed in search', async () => {
    const user = userEvent.setup();
    const { props } = renderFilterPanel();
    const input = screen.getByPlaceholderText('Buscar por cliente o número...');
    await user.type(input, 'J');
    expect(props.onFilterChange).toHaveBeenCalledWith('searchText', 'J');
  });

  it('calls onReset when "Limpiar filtros" button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderFilterPanel({
      filters: { ...DEFAULT_FILTERS, parkingStatus: 'parked' },
    });
    const button = screen.getByRole('button', { name: /limpiar todos los filtros/i });
    await user.click(button);
    expect(props.onReset).toHaveBeenCalledOnce();
  });
});
