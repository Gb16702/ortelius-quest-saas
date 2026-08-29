import type { MessageReadClockPort } from '../application/ports'

export class SystemMessageReadClock implements MessageReadClockPort {
  now(): Date {
    return new Date()
  }
}
