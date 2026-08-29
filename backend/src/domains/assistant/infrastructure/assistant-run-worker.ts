import { assistantAiService } from './assistant-ai.service'
import { runAssistantMessageJob } from './assistant-message-runner'
import { assistantRealtimeNotifier } from './assistant-realtime-notifier.adapter'
import { assistantRunQueue } from './assistant-run-queue'
import { assistantRepository } from './drizzle-assistant.repository'

export function startAssistantRunProcessor(): void {
  assistantRunQueue.startProcessor((job) =>
    runAssistantMessageJob({
      job,
      cancellationChecker: assistantRunQueue,
      realtimeNotifier: assistantRealtimeNotifier,
      repository: assistantRepository,
      service: assistantAiService,
    })
  )
}
