export class QuoteDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuoteDomainError'
  }
}

export class UnsupportedQuoteCurrencyError extends QuoteDomainError {
  constructor(currency: string, supportedCurrencies: readonly string[]) {
    super(
      `Currency ${currency} is not supported. Supported currencies: ${supportedCurrencies.join(', ')}`
    )
    this.name = 'UnsupportedQuoteCurrencyError'
  }
}
