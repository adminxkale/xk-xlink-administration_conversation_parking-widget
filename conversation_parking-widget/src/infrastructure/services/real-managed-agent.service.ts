import { ManagedAgentService } from '@/src/domain/ports/managed-agent-service.port';
import { ManagedAgent } from '@/src/domain/entities/managed-agent';

interface ManagedAgentsApiResponse {
  agent_id: string;
  agents: Record<string, string>;
  is_supervisor: boolean;
  name: string;
}

export class RealManagedAgentService implements ManagedAgentService {
  async getManagedAgents(principalAgentId: string): Promise<ManagedAgent[]> {
    const response = await fetch(
      `/api/proxy-managed-agents?principal_agent_id=${encodeURIComponent(principalAgentId)}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch managed agents: ${response.status} ${response.statusText}`
      );
    }

    const data: ManagedAgentsApiResponse[] = await response.json();

    // Transform the API response into ManagedAgent[]
    // The API returns objects with an "agents" map { id: name }
    // We also include the principal agent itself from each entry
    const agents: ManagedAgent[] = [];
    const seenIds = new Set<string>();

    for (const entry of data) {
      // Add the principal agent from this entry
      if (entry.agent_id && !seenIds.has(entry.agent_id)) {
        seenIds.add(entry.agent_id);
        agents.push({ id: entry.agent_id, name: entry.name });
      }

      // Add managed agents from the "agents" map
      if (entry.agents && typeof entry.agents === 'object') {
        for (const [agentId, agentName] of Object.entries(entry.agents)) {
          if (agentId && !seenIds.has(agentId)) {
            seenIds.add(agentId);
            agents.push({ id: agentId, name: agentName });
          }
        }
      }
    }

    return agents;
  }
}
