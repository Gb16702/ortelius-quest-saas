import { createCallLifecycleUseCases } from '../application/call-lifecycle.use-cases'
import { callEvents } from '../domain/call-events.service'
import { voipCallRepository } from './voip-call.repository'

export { CallLifecycleError } from '../application/call-lifecycle.use-cases'

export const callLifecycleService = createCallLifecycleUseCases({
  repository: voipCallRepository,
  events: callEvents,
})
