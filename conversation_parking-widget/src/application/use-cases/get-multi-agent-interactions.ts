import { InteractionService } from '@/src/domain/ports/interaction-service.port';
import { Interaction } from '@/src/domain/entities/interaction';
import { ManagedAgent } from '@/src/domain/entities/managed-agent';

export interface MultiAgentResult {
  interactions: Interaction[];
  failedAgentIds: string[];
}

export async function getMultiAgentInteractions(
  service: InteractionService,
  agents: ManagedAgent[],
  tenant?: string
): Promise<MultiAgentResult> {
  const results = await Promise.allSettled(
    agents.map(async (agent) => {
      const interactions = await service.getInteractions(agent.id, tenant);
      return interactions.map((interaction) => ({
        ...interaction,
        agentId: interaction.agentId ?? agent.id,
        agentName: interaction.agentName ?? agent.name,
      }));
    })
  );

  const interactions: Interaction[] = [];
  const failedAgentIds: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      interactions.push(...result.value);
    } else {
      failedAgentIds.push(agents[index].id);
    }
  });

  interactions.sort(
    (a, b) => new Date(b.startTimestamp).getTime() - new Date(a.startTimestamp).getTime()
  );

  return { interactions, failedAgentIds };
}
