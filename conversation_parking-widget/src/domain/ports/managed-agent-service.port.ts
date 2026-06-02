import { ManagedAgent } from '../entities/managed-agent';

export interface ManagedAgentService {
  getManagedAgents(principalAgentId: string): Promise<ManagedAgent[]>;
}
