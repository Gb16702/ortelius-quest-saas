import type { AssistantAction } from './assistant-models'

export const QUEST_ASSISTANT_STATUS_EVENT = 'quest_assistant:status'
export const QUEST_ASSISTANT_ACTION_PROPOSED_EVENT = 'quest_assistant:action_proposed'

export interface AssistantStreamStatus {
  label: string
  body: string
}

export type AssistantStreamAction = Omit<
  AssistantAction,
  'expiresAt' | 'confirmedAt' | 'executedAt' | 'cancelledAt' | 'createdAt' | 'updatedAt'
> & {
  expiresAt: string
  confirmedAt: string | null
  executedAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export type QuestAssistantCustomStreamEvent =
  | {
      name: typeof QUEST_ASSISTANT_STATUS_EVENT
      value: AssistantStreamStatus
    }
  | {
      name: typeof QUEST_ASSISTANT_ACTION_PROPOSED_EVENT
      value: {
        action: AssistantStreamAction
      }
    }

export interface AssistantStreamEventPublisher {
  publish(event: QuestAssistantCustomStreamEvent): void
}
