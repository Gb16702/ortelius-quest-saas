export type OrganizationMemberMutationTarget = {
  userId: string
  role: string
}

export function assertCanChangeOrganizationMemberRole(input: {
  callerId: string
  target: OrganizationMemberMutationTarget
}): void {
  if (input.target.role === 'owner') {
    throw new Error('Owner roles cannot be changed')
  }

  if (input.target.userId === input.callerId) {
    throw new Error('You cannot change your own role')
  }
}

export function assertCanRemoveOrganizationMember(input: {
  callerId: string
  target: OrganizationMemberMutationTarget
}): void {
  if (input.target.role === 'owner') {
    throw new Error('Owners cannot be removed')
  }

  if (input.target.userId === input.callerId) {
    throw new Error('You cannot remove yourself. Use leave organization instead.')
  }
}

export function assertCanLeaveOrganization(role: string): void {
  if (role === 'owner') {
    throw new Error('Owners must transfer ownership before leaving')
  }
}
