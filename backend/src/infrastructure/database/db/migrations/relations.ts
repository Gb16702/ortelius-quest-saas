import { relations } from 'drizzle-orm/relations'
import {
  account,
  anonymousUser,
  cargoDetails,
  category,
  conversation,
  conversationParticipant,
  dimensions,
  invitation,
  invoice,
  member,
  message,
  messageReaction,
  messageRead,
  notification,
  organization,
  organizationCategories,
  organizationMetrics,
  organizationMetricsDaily,
  organizationServices,
  quote,
  request,
  service,
  session,
  transcripts,
  twoFactor,
  user,
  voipCall,
  voipCallParticipant,
} from './schema'

export const organizationMetricsDailyRelations = relations(organizationMetricsDaily, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationMetricsDaily.organizationId],
    references: [organization.id],
  }),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  organizationMetricsDailies: many(organizationMetricsDaily),
  organizationMetrics: many(organizationMetrics),
  members: many(member),
  invoices: many(invoice),
  quotes: many(quote),
  invitations: many(invitation),
  conversations: many(conversation),
  requests: many(request),
  organizationCategories: many(organizationCategories),
  organizationServices: many(organizationServices),
}))

export const organizationMetricsRelations = relations(organizationMetrics, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationMetrics.organizationId],
    references: [organization.id],
  }),
}))

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}))

export const userRelations = relations(user, ({ many }) => ({
  notifications: many(notification),
  accounts: many(account),
  messageReads: many(messageRead),
  members: many(member),
  conversationParticipants: many(conversationParticipant),
  sessions: many(session),
  messageReactions: many(messageReaction),
  voipCallParticipants: many(voipCallParticipant),
  invoices: many(invoice),
  quotes_createdById: many(quote, {
    relationName: 'quote_createdById_user_id',
  }),
  quotes_respondedById: many(quote, {
    relationName: 'quote_respondedById_user_id',
  }),
  invitations: many(invitation),
  conversations_createdBy: many(conversation, {
    relationName: 'conversation_createdBy_user_id',
  }),
  conversations_requesterId: many(conversation, {
    relationName: 'conversation_requesterId_user_id',
  }),
  twoFactors: many(twoFactor),
  messages: many(message),
  voipCalls: many(voipCall),
  requests_assignedToId: many(request, {
    relationName: 'request_assignedToId_user_id',
  }),
  requests_assignedById: many(request, {
    relationName: 'request_assignedById_user_id',
  }),
  requests_requesterId: many(request, {
    relationName: 'request_requesterId_user_id',
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const messageReadRelations = relations(messageRead, ({ one }) => ({
  message: one(message, {
    fields: [messageRead.messageId],
    references: [message.id],
  }),
  user: one(user, {
    fields: [messageRead.userId],
    references: [user.id],
  }),
}))

export const messageRelations = relations(message, ({ one, many }) => ({
  messageReads: many(messageRead),
  messageReactions: many(messageReaction),
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  user: one(user, {
    fields: [message.senderId],
    references: [user.id],
  }),
}))

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}))

export const conversationParticipantRelations = relations(conversationParticipant, ({ one }) => ({
  conversation: one(conversation, {
    fields: [conversationParticipant.conversationId],
    references: [conversation.id],
  }),
  user: one(user, {
    fields: [conversationParticipant.userId],
    references: [user.id],
  }),
}))

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  conversationParticipants: many(conversationParticipant),
  transcripts: many(transcripts),
  anonymousUser: one(anonymousUser, {
    fields: [conversation.anonymousRequesterId],
    references: [anonymousUser.id],
  }),
  user_createdBy: one(user, {
    fields: [conversation.createdBy],
    references: [user.id],
    relationName: 'conversation_createdBy_user_id',
  }),
  organization: one(organization, {
    fields: [conversation.organizationId],
    references: [organization.id],
  }),
  user_requesterId: one(user, {
    fields: [conversation.requesterId],
    references: [user.id],
    relationName: 'conversation_requesterId_user_id',
  }),
  messages: many(message),
  voipCalls: many(voipCall),
  requests: many(request),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const messageReactionRelations = relations(messageReaction, ({ one }) => ({
  message: one(message, {
    fields: [messageReaction.messageId],
    references: [message.id],
  }),
  user: one(user, {
    fields: [messageReaction.userId],
    references: [user.id],
  }),
}))

export const voipCallParticipantRelations = relations(voipCallParticipant, ({ one }) => ({
  voipCall: one(voipCall, {
    fields: [voipCallParticipant.callId],
    references: [voipCall.id],
  }),
  user: one(user, {
    fields: [voipCallParticipant.userId],
    references: [user.id],
  }),
}))

export const voipCallRelations = relations(voipCall, ({ one, many }) => ({
  voipCallParticipants: many(voipCallParticipant),
  conversation: one(conversation, {
    fields: [voipCall.conversationId],
    references: [conversation.id],
  }),
  user: one(user, {
    fields: [voipCall.callerId],
    references: [user.id],
  }),
}))

export const invoiceRelations = relations(invoice, ({ one }) => ({
  request: one(request, {
    fields: [invoice.requestId],
    references: [request.id],
  }),
  quote: one(quote, {
    fields: [invoice.quoteId],
    references: [quote.id],
  }),
  organization: one(organization, {
    fields: [invoice.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invoice.createdById],
    references: [user.id],
  }),
}))

export const requestRelations = relations(request, ({ one, many }) => ({
  invoices: many(invoice),
  quotes: many(quote),
  user_assignedToId: one(user, {
    fields: [request.assignedToId],
    references: [user.id],
    relationName: 'request_assignedToId_user_id',
  }),
  user_assignedById: one(user, {
    fields: [request.assignedById],
    references: [user.id],
    relationName: 'request_assignedById_user_id',
  }),
  user_requesterId: one(user, {
    fields: [request.requesterId],
    references: [user.id],
    relationName: 'request_requesterId_user_id',
  }),
  organization: one(organization, {
    fields: [request.receiverOrganizationId],
    references: [organization.id],
  }),
  conversation: one(conversation, {
    fields: [request.conversationId],
    references: [conversation.id],
  }),
  cargoDetail: one(cargoDetails, {
    fields: [request.cargoDetailsId],
    references: [cargoDetails.id],
  }),
}))

export const quoteRelations = relations(quote, ({ one, many }) => ({
  invoices: many(invoice),
  request: one(request, {
    fields: [quote.requestId],
    references: [request.id],
  }),
  organization: one(organization, {
    fields: [quote.organizationId],
    references: [organization.id],
  }),
  user_createdById: one(user, {
    fields: [quote.createdById],
    references: [user.id],
    relationName: 'quote_createdById_user_id',
  }),
  user_respondedById: one(user, {
    fields: [quote.respondedById],
    references: [user.id],
    relationName: 'quote_respondedById_user_id',
  }),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}))

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  conversation: one(conversation, {
    fields: [transcripts.conversationId],
    references: [conversation.id],
  }),
}))

export const anonymousUserRelations = relations(anonymousUser, ({ many }) => ({
  conversations: many(conversation),
}))

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}))

export const cargoDetailsRelations = relations(cargoDetails, ({ one, many }) => ({
  dimension: one(dimensions, {
    fields: [cargoDetails.dimensionsId],
    references: [dimensions.id],
  }),
  requests: many(request),
}))

export const dimensionsRelations = relations(dimensions, ({ many }) => ({
  cargoDetails: many(cargoDetails),
}))

export const organizationCategoriesRelations = relations(organizationCategories, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationCategories.organizationId],
    references: [organization.id],
  }),
  category: one(category, {
    fields: [organizationCategories.categoryId],
    references: [category.id],
  }),
}))

export const categoryRelations = relations(category, ({ many }) => ({
  organizationCategories: many(organizationCategories),
}))

export const organizationServicesRelations = relations(organizationServices, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationServices.organizationId],
    references: [organization.id],
  }),
  service: one(service, {
    fields: [organizationServices.serviceId],
    references: [service.id],
  }),
}))

export const serviceRelations = relations(service, ({ many }) => ({
  organizationServices: many(organizationServices),
}))
