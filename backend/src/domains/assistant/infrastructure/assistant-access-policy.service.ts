import { env } from '../../../infrastructure/config/environment'
import { AssistantAccessPolicy } from '../application/assistant-access-policy'
import { assistantRepository } from './drizzle-assistant.repository'

export const assistantAccessPolicy = new AssistantAccessPolicy(assistantRepository, {
  enabled: env.QUEST_ASSISTANT_ENABLED,
  allowedPlans: ['professional', 'enterprise'],
  allowedStatuses: ['active', 'trialing'],
})
