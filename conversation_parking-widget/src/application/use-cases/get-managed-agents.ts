import { ManagedAgentService } from '@/src/domain/ports/managed-agent-service.port';
import { ManagedAgent } from '@/src/domain/entities/managed-agent';

export async function getManagedAgents(
  service: ManagedAgentService,
  principalAgentId: string,
  tenant?: string
): Promise<ManagedAgent[]> {
  return service.getManagedAgents(principalAgentId, tenant);
}
