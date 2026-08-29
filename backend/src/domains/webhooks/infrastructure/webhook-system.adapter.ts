import { nanoid } from 'nanoid'
import type { WebhookClockPort, WebhookIdPort } from '../application/ports'

export class NanoidWebhookIdAdapter implements WebhookIdPort {
  newRequestId(): string {
    return nanoid()
  }
}

export class SystemWebhookClockAdapter implements WebhookClockPort {
  now(): Date {
    return new Date()
  }
}
