import type { CheckoutClockPort, CheckoutIdPort } from '../application/ports'

export class CryptoCheckoutIdAdapter implements CheckoutIdPort {
  randomId(): string {
    return crypto.randomUUID()
  }
}

export class SystemCheckoutClockAdapter implements CheckoutClockPort {
  now(): Date {
    return new Date()
  }
}
