interface EventTypeMeta {
  label: string
  description: string
}

export const EVENT_TYPE_METADATA: Record<string, EventTypeMeta> = {
  'request-created': {
    label: 'Request created',
    description: 'A new request was created.',
  },
  'request-updated': {
    label: 'Request updated',
    description: "A request's details were modified.",
  },
  'request-rejected': {
    label: 'Request rejected',
    description: 'A request was rejected.',
  },
  'request-validated': {
    label: 'Request validated',
    description: 'A request was approved and validated.',
  },
  'request-deleted': {
    label: 'Request deleted',
    description: 'A request was permanently deleted.',
  },
  'request-cancelled': {
    label: 'Request cancelled',
    description: 'A request was cancelled.',
  },
  'request-document-removed': {
    label: 'Request document removed',
    description: 'A document was removed from a request.',
  },
  'request-linked-to-user': {
    label: 'Request linked to user',
    description: 'A request was linked to a user.',
  },
  'request-assigned': {
    label: 'Request assigned',
    description: 'A request was assigned to a member.',
  },
  'request-reassigned': {
    label: 'Request reassigned',
    description: 'A request was reassigned to another member.',
  },
  'request-unassigned': {
    label: 'Request unassigned',
    description: 'A member was unassigned from a request.',
  },
  'request-shared-to-team-chat': {
    label: 'Request shared to team chat',
    description: 'A request was shared to the team chat.',
  },
  'quote-created': {
    label: 'Quote created',
    description: 'A new quote was created.',
  },
  'quote-updated': {
    label: 'Quote updated',
    description: "A quote's details were modified.",
  },
  'quote-accepted': {
    label: 'Quote accepted',
    description: 'A quote was accepted by the client.',
  },
  'quote-rejected': {
    label: 'Quote rejected',
    description: 'A quote was rejected by the client.',
  },
  'invoice-created': {
    label: 'Invoice created',
    description: 'A new invoice was generated.',
  },
  'invoice-sent': {
    label: 'Invoice sent',
    description: 'An invoice was sent to the client.',
  },
  'member-invited': {
    label: 'Member invited',
    description: 'A new member was invited to the organization.',
  },
  'invitation-resent': {
    label: 'Invitation resent',
    description: 'An invitation was resent to a user.',
  },
  'invitation-role-updated': {
    label: 'Invitation role updated',
    description: "An invitation's role was changed.",
  },
  'invitation-cancelled': {
    label: 'Invitation cancelled',
    description: 'A pending invitation was cancelled.',
  },
  'member-role-updated': {
    label: 'Member role updated',
    description: "A member's role was changed.",
  },
  'member-removed': {
    label: 'Member removed',
    description: 'A member was removed from the organization.',
  },
  'member-left': {
    label: 'Member left',
    description: 'A member left the organization.',
  },
  'invitations-cancelled-bulk': {
    label: 'Invitations cancelled (bulk)',
    description: 'Multiple invitations were cancelled at once.',
  },
  'organization-updated': {
    label: 'Organization updated',
    description: 'Organization information was updated.',
  },
  'organization-categories-updated': {
    label: 'Organization categories updated',
    description: 'Organization categories were changed.',
  },
  'organization-services-updated': {
    label: 'Organization services updated',
    description: 'Organization services were modified.',
  },
  'organization-tax-id-updated': {
    label: 'Tax ID updated',
    description: 'Organization tax ID was updated.',
  },
  'organization-logo-updated': {
    label: 'Organization logo updated',
    description: 'Organization logo was changed.',
  },
  'organization-logo-removed': {
    label: 'Organization logo removed',
    description: 'Organization logo was removed.',
  },
  'showcase-invitations-sent': {
    label: 'Showcase invitations sent',
    description: 'Showcase invitations were sent.',
  },
  'email-intake-updated': {
    label: 'Email intake updated',
    description: 'Email intake settings were changed.',
  },
  'service-pricing-updated': {
    label: 'Service pricing updated',
    description: 'Service pricing was modified.',
  },
  'call-started': {
    label: 'Call started',
    description: 'A call was initiated.',
  },
  'call-ended': {
    label: 'Call ended',
    description: 'A call was ended.',
  },
  'subscription-created': {
    label: 'Subscription created',
    description: 'A new subscription was created.',
  },
  'subscription-confirmed': {
    label: 'Subscription confirmed',
    description: 'A subscription was confirmed.',
  },
  'subscription-seats-reconciled': {
    label: 'Subscription seats reconciled',
    description: 'Subscription seats were reconciled.',
  },
  'user-name-updated': {
    label: 'User name updated',
    description: "A user's name was changed.",
  },
  'two-factor-enabled': {
    label: 'Two-factor enabled',
    description: 'A user enabled two-factor authentication.',
  },
  'two-factor-disabled': {
    label: 'Two-factor disabled',
    description: 'A user disabled two-factor authentication.',
  },
}
