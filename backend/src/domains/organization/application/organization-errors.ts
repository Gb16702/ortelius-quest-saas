export class OrganizationNotFoundError extends Error {
  constructor(message = 'Organization not found') {
    super(message)
    this.name = 'OrganizationNotFoundError'
  }
}

export class OrganizationPermissionError extends Error {
  constructor(message = 'Insufficient permissions. Admin or Owner role required') {
    super(message)
    this.name = 'OrganizationPermissionError'
  }
}
