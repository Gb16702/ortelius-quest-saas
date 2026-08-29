const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class InvoiceEmailError extends Error {
  constructor(
    public code: 'INVALID_EMAIL' | 'STRIPE_UNAVAILABLE',
    message: string
  ) {
    super(message)
  }
}

export interface InvoiceEmailState {
  current: string | null
}

export const SUPPORTED_INVOICE_LANGUAGES = ['en', 'fr', 'nl', 'es'] as const
export type InvoiceLanguage = (typeof SUPPORTED_INVOICE_LANGUAGES)[number]

export class InvoiceLanguageError extends Error {
  constructor(
    public code: 'INVALID_LANGUAGE' | 'STRIPE_UNAVAILABLE',
    message: string
  ) {
    super(message)
  }
}

export interface InvoiceLanguageState {
  current: InvoiceLanguage | null
}

export class BillingAddressError extends Error {
  constructor(
    public code: 'INVALID_ADDRESS' | 'STRIPE_UNAVAILABLE',
    message: string
  ) {
    super(message)
  }
}

export interface BillingAddress {
  country: string
  line1: string
  line2: string | null
  city: string
  postalCode: string
  state: string | null
}

export interface UpdateBillingAddressInput {
  organizationId: string
  address: BillingAddress
  name?: string | null
}

export function normalizeInvoiceEmail(email: string): string {
  const normalized = email.trim()

  if (!EMAIL_REGEX.test(normalized)) {
    throw new InvoiceEmailError('INVALID_EMAIL', 'A valid email address is required.')
  }

  return normalized
}

export function isSupportedInvoiceLanguage(value: string): value is InvoiceLanguage {
  return (SUPPORTED_INVOICE_LANGUAGES as readonly string[]).includes(value)
}

export function parseInvoiceLanguage(language: string): InvoiceLanguage {
  if (!isSupportedInvoiceLanguage(language)) {
    throw new InvoiceLanguageError('INVALID_LANGUAGE', 'Unsupported invoice language.')
  }

  return language
}

export function findSupportedInvoiceLanguage(
  preferredLocales: readonly string[]
): InvoiceLanguage | null {
  return preferredLocales.find((locale) => isSupportedInvoiceLanguage(locale)) ?? null
}

export function validateBillingAddress(address: BillingAddress): void {
  if (
    !address.country ||
    address.country.length !== 2 ||
    !address.line1 ||
    !address.city ||
    !address.postalCode
  ) {
    throw new BillingAddressError(
      'INVALID_ADDRESS',
      'Country (ISO 2), address line, city, and postal code are required.'
    )
  }
}

export function resolveBillingName(
  requestedName: string | null | undefined,
  organizationName: string | null
): string | null {
  const normalizedRequested = requestedName?.trim()
  return normalizedRequested && normalizedRequested.length > 0
    ? normalizedRequested
    : organizationName
}
