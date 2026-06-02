import { InteractionService } from '../../domain/ports/interaction-service.port';
import { TemplateService } from '../../domain/ports/template-service.port';
import { ManagedAgentService } from '../../domain/ports/managed-agent-service.port';
// import { MockInteractionService } from '../services/mock-interaction.service';
import { RealInteractionService } from '../services/real-interaction.service';
import { TemplateServiceImpl } from '../services/template.service';
import { RealManagedAgentService } from '../services/real-managed-agent.service';

// --- Swap implementations here ---
// const interactionService: InteractionService = new MockInteractionService();
const interactionService: InteractionService = new RealInteractionService();

const templateService: TemplateService = new TemplateServiceImpl();

const managedAgentService: ManagedAgentService = new RealManagedAgentService();

export function getInteractionService(): InteractionService {
  return interactionService;
}

export function getTemplateService(): TemplateService {
  return templateService;
}

export function getManagedAgentService(): ManagedAgentService {
  return managedAgentService;
}
