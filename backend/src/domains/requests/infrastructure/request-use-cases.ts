import {
  AssignRequestUseCase,
  CancelRequestUseCase,
  CheckRequestActionPermissionUseCase,
  CheckRequestAssignmentPermissionUseCase,
  CheckRequestReceiverMembershipUseCase,
  CheckRequestViewPermissionUseCase,
  CreateRequestUseCase,
  DeleteDraftRequestUseCase,
  GetRequestByIdUseCase,
  GetRequestByNumberUseCase,
  GetRequestOrganizationAggregationUseCase,
  LinkRequestsToUserUseCase,
  ListAccessibleRequestsUseCase,
  ListAssignedRequestsUseCase,
  ListOrganizationRequestsUseCase,
  ListRequestOrganizationMembersUseCase,
  ListUnassignedRequestsUseCase,
  ListUserRequestsUseCase,
  ReassignRequestUseCase,
  RejectRequestUseCase,
  ResolveAccessibleRequestByIdUseCase,
  ResolveAccessibleRequestByNumberUseCase,
  ResolveRequestOrganizationUseCase,
  ShareRequestToTeamChatUseCase,
  UnassignRequestUseCase,
  UpdateRequestUseCase,
  ValidateDraftRequestUseCase,
} from '../application/request-use-cases'

export interface RequestUseCaseContainer {
  create: CreateRequestUseCase
  update: UpdateRequestUseCase
  getById: GetRequestByIdUseCase
  getByNumber: GetRequestByNumberUseCase
  getOrganizationAggregation: GetRequestOrganizationAggregationUseCase
  listUser: ListUserRequestsUseCase
  listAccessible: ListAccessibleRequestsUseCase
  listOrganizationRequests: ListOrganizationRequestsUseCase
  listOrganizationMembers: ListRequestOrganizationMembersUseCase
  listAssigned: ListAssignedRequestsUseCase
  listUnassigned: ListUnassignedRequestsUseCase
  reject: RejectRequestUseCase
  cancel: CancelRequestUseCase
  deleteDraft: DeleteDraftRequestUseCase
  validateDraft: ValidateDraftRequestUseCase
  assign: AssignRequestUseCase
  reassign: ReassignRequestUseCase
  unassign: UnassignRequestUseCase
  linkToUser: LinkRequestsToUserUseCase
  shareToTeamChat: ShareRequestToTeamChatUseCase
  checkActionPermission: CheckRequestActionPermissionUseCase
  checkAssignmentPermission: CheckRequestAssignmentPermissionUseCase
  checkViewPermission: CheckRequestViewPermissionUseCase
  resolveRequestOrganization: ResolveRequestOrganizationUseCase
  resolveAccessibleRequestById: ResolveAccessibleRequestByIdUseCase
  resolveAccessibleRequestByNumber: ResolveAccessibleRequestByNumberUseCase
  checkReceiverMembership: CheckRequestReceiverMembershipUseCase
}

let requestUseCases: RequestUseCaseContainer | null = null

export async function getRequestUseCases(): Promise<RequestUseCaseContainer> {
  if (requestUseCases) return requestUseCases

  const [
    { ActivityLogAdapter },
    { DrizzleRequestRepository },
    { MemberRequestAssignmentMetricsAdapter },
    { OrganizationMembershipAdapter },
    { RequestAuthorizationAdapter },
    { RequestConversationPersistenceAdapter },
    { RequestConversationQueryAdapter },
    { RequestCreationConversationAdapter },
    { RequestCreationMetricsAdapter },
    { RequestLinkingConversationAdapter },
    { RequestNotificationAdapter },
    { RequestOrganizationQueryAdapter },
    { RequestSystemMessageAdapter },
    { RequestTeamChatAdapter },
  ] = await Promise.all([
    import('./activity-log.adapter'),
    import('./drizzle-request.repository'),
    import('./member-request-assignment-metrics.adapter'),
    import('./organization-membership.adapter'),
    import('./request-authorization.adapter'),
    import('./request-conversation-persistence.adapter'),
    import('./request-conversation-query.adapter'),
    import('./request-creation-conversation.adapter'),
    import('./request-creation-metrics.adapter'),
    import('./request-linking-conversation.adapter'),
    import('./request-notification.adapter'),
    import('./request-organization-query.adapter'),
    import('./request-system-message.adapter'),
    import('./request-team-chat.adapter'),
  ])

  const requestRepository = new DrizzleRequestRepository()
  const activityLog = new ActivityLogAdapter()
  const notificationPort = new RequestNotificationAdapter()
  const organizationMembership = new OrganizationMembershipAdapter()
  const requestAuthorization = new RequestAuthorizationAdapter()
  const assignmentMetrics = new MemberRequestAssignmentMetricsAdapter()
  const conversationPersistence = new RequestConversationPersistenceAdapter()
  const conversationQueries = new RequestConversationQueryAdapter()
  const systemMessages = new RequestSystemMessageAdapter()
  const creationConversation = new RequestCreationConversationAdapter(
    conversationQueries,
    conversationPersistence,
    systemMessages
  )
  const creationMetrics = new RequestCreationMetricsAdapter()
  const requestLinkingConversation = new RequestLinkingConversationAdapter(
    conversationQueries,
    conversationPersistence,
    systemMessages
  )
  const requestOrganizationQuery = new RequestOrganizationQueryAdapter()
  const requestTeamChat = new RequestTeamChatAdapter()

  requestUseCases = {
    create: new CreateRequestUseCase(
      requestRepository,
      organizationMembership,
      activityLog,
      notificationPort,
      creationConversation,
      creationMetrics
    ),
    update: new UpdateRequestUseCase(requestRepository, activityLog),
    getById: new GetRequestByIdUseCase(requestRepository),
    getByNumber: new GetRequestByNumberUseCase(requestRepository),
    getOrganizationAggregation: new GetRequestOrganizationAggregationUseCase(
      requestOrganizationQuery
    ),
    listUser: new ListUserRequestsUseCase(requestRepository),
    listAccessible: new ListAccessibleRequestsUseCase(requestRepository, requestOrganizationQuery),
    listOrganizationRequests: new ListOrganizationRequestsUseCase(requestOrganizationQuery),
    listOrganizationMembers: new ListRequestOrganizationMembersUseCase(requestOrganizationQuery),
    listAssigned: new ListAssignedRequestsUseCase(requestRepository),
    listUnassigned: new ListUnassignedRequestsUseCase(requestRepository),
    reject: new RejectRequestUseCase(requestRepository, activityLog, notificationPort),
    cancel: new CancelRequestUseCase(requestRepository, activityLog, notificationPort),
    deleteDraft: new DeleteDraftRequestUseCase(requestRepository, activityLog),
    validateDraft: new ValidateDraftRequestUseCase(
      requestRepository,
      activityLog,
      notificationPort
    ),
    linkToUser: new LinkRequestsToUserUseCase(requestRepository, requestLinkingConversation),
    shareToTeamChat: new ShareRequestToTeamChatUseCase(
      requestRepository,
      organizationMembership,
      requestTeamChat,
      activityLog
    ),
    assign: new AssignRequestUseCase(
      requestRepository,
      organizationMembership,
      assignmentMetrics,
      activityLog,
      notificationPort
    ),
    reassign: new ReassignRequestUseCase(
      requestRepository,
      organizationMembership,
      activityLog,
      notificationPort
    ),
    unassign: new UnassignRequestUseCase(requestRepository, activityLog, notificationPort),
    checkActionPermission: new CheckRequestActionPermissionUseCase(requestAuthorization),
    checkAssignmentPermission: new CheckRequestAssignmentPermissionUseCase(requestAuthorization),
    checkViewPermission: new CheckRequestViewPermissionUseCase(requestAuthorization),
    resolveRequestOrganization: new ResolveRequestOrganizationUseCase(requestAuthorization),
    resolveAccessibleRequestById: new ResolveAccessibleRequestByIdUseCase(requestAuthorization),
    resolveAccessibleRequestByNumber: new ResolveAccessibleRequestByNumberUseCase(
      requestAuthorization
    ),
    checkReceiverMembership: new CheckRequestReceiverMembershipUseCase(organizationMembership),
  }

  return requestUseCases
}
