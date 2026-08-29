export class QuoteCreateForbiddenError extends Error {
  constructor() {
    super(
      'You do not have permission to create quotes for this request. Only admins, owners, or the assigned member can create quotes.'
    )
    this.name = 'QuoteCreateForbiddenError'
  }
}

export class QuoteOrganizationMissingError extends Error {
  constructor() {
    super('User not associated with any organization')
    this.name = 'QuoteOrganizationMissingError'
  }
}

export class QuoteLegalDocumentsMismatchError extends Error {
  constructor() {
    super('One or more legal documents do not belong to this organization or have been deleted')
    this.name = 'QuoteLegalDocumentsMismatchError'
  }
}
