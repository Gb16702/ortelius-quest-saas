import { and, desc, eq, inArray, isNull, like, or, type SQL, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../infrastructure/database'
import { member, organization, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { category } from '../../../infrastructure/database/db/schemas/category-schema'
import {
  cargoDetails,
  dimensions,
  type EFragility,
  ERequestClosedReason,
  ERequestLifecycleStatus,
  request as requestTable,
} from '../../../infrastructure/database/db/schemas/request-schema'
import { service } from '../../../infrastructure/database/db/schemas/services-schema'
import type { RequestRepositoryPort } from '../application/ports'
import type {
  CreateRequestData,
  Request,
  RequestFilters,
  RequestWithRelations,
  UpdateRequestData,
} from '../application/request-models'
import { calculateRequestPriority } from '../domain/request-priority'

export class DrizzleRequestRepository implements RequestRepositoryPort {
  async create(data: CreateRequestData): Promise<Request> {
    try {
      const requestId = nanoid()
      const cargoDetailsId = await this.createCargoDetails(data.cargoDetails)
      const [newRequest] = await db
        .insert(requestTable)
        .values({
          id: requestId,
          reqNumber: `REQ-${Date.now()}`,
          lifecycleStatus: ERequestLifecycleStatus.OPEN,
          closedReason: null,
          requesterEmail: data.requesterEmail,
          requesterName: data.requesterName,
          requesterPhone: data.requesterPhone,
          requesterId: data.requesterId,
          receiverOrganizationId: data.receiverOrganizationId,
          categories: data.categories,
          services: data.services,
          extraServices: data.extraServices,
          cargoDetailsId,
          comments: data.comments,
          documents: data.documents,
          fromDate: new Date(data.fromDate),
          toDate: new Date(data.toDate),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      return newRequest as Request
    } catch (error) {
      throw new Error('Failed to create request', { cause: error })
    }
  }

  async update(id: string, data: UpdateRequestData): Promise<Request> {
    try {
      const existingRequest = await this.getById(id)
      if (!existingRequest) {
        throw new Error('Request not found')
      }

      if (data.cargoDetails && existingRequest.cargoDetailsId) {
        await this.updateCargoDetails(existingRequest.cargoDetailsId, data.cargoDetails)
      }

      const updateData = this.buildRequestUpdateData(data)
      const [updatedRequest] = await db
        .update(requestTable)
        .set(updateData)
        .where(eq(requestTable.id, id))
        .returning()

      return updatedRequest as Request
    } catch (error) {
      throw new Error(`Failed to update request ${id}`, { cause: error })
    }
  }

  async attachConversationToRequest(requestId: string, conversationId: string): Promise<void> {
    try {
      await db.update(requestTable).set({ conversationId }).where(eq(requestTable.id, requestId))
    } catch (error) {
      throw new Error(`Failed to attach conversation to request ${requestId}`, { cause: error })
    }
  }

  async getById(id: string): Promise<Request | null> {
    try {
      const result = await db.select().from(requestTable).where(eq(requestTable.id, id)).limit(1)
      return result[0] ?? null
    } catch (error) {
      throw new Error(`Failed to fetch request ${id}`, { cause: error })
    }
  }

  async getByIdWithRelations(id: string): Promise<RequestWithRelations | null> {
    try {
      const result = await db
        .select({
          id: requestTable.id,
          reqNumber: requestTable.reqNumber,
          requesterId: requestTable.requesterId,
          receiverOrganizationId: requestTable.receiverOrganizationId,
          conversationId: requestTable.conversationId,
          lifecycleStatus: requestTable.lifecycleStatus,
          closedReason: requestTable.closedReason,
          categories: requestTable.categories,
          services: requestTable.services,
          extraServices: requestTable.extraServices,
          cargoDetailsId: requestTable.cargoDetailsId,
          comments: requestTable.comments,
          documents: requestTable.documents,
          assignedToId: requestTable.assignedToId,
          assignedAt: requestTable.assignedAt,
          assignedById: requestTable.assignedById,
          fromDate: requestTable.fromDate,
          toDate: requestTable.toDate,
          createdAt: requestTable.createdAt,
          updatedAt: requestTable.updatedAt,
          requesterEmail: requestTable.requesterEmail,
          requesterName: requestTable.requesterName,
          requesterPhone: requestTable.requesterPhone,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo,
            taxIdType: organization.taxIdType,
          },
        })
        .from(requestTable)
        .leftJoin(organization, eq(requestTable.receiverOrganizationId, organization.id))
        .where(eq(requestTable.id, id))
        .limit(1)

      if (!result.length) {
        return null
      }

      const requestData = result[0]
      const cargoDetailsData = requestData.cargoDetailsId
        ? await this.getCargoDetails(requestData.cargoDetailsId)
        : null

      const servicesPromise = requestData.services?.length
        ? db
            .select({
              id: service.id,
              name: service.name,
              slug: service.slug,
              type: service.type,
              createdAt: service.createdAt,
            })
            .from(service)
            .where(inArray(service.id, requestData.services))
        : Promise.resolve([])

      const categoriesPromise = requestData.categories?.length
        ? db
            .select({
              id: category.id,
              name: category.name,
              slug: category.slug,
              createdAt: category.createdAt,
              updatedAt: category.updatedAt,
            })
            .from(category)
            .where(inArray(category.id, requestData.categories))
        : Promise.resolve([])

      const assignedToPromise = requestData.assignedToId
        ? db
            .select({
              id: user.id,
              name: user.name,
              email: user.email,
              role: member.role,
            })
            .from(user)
            .innerJoin(
              member,
              and(
                eq(member.userId, user.id),
                eq(member.organizationId, requestData.receiverOrganizationId)
              )
            )
            .where(eq(user.id, requestData.assignedToId))
            .limit(1)
        : Promise.resolve([])

      const assignedByPromise = requestData.assignedById
        ? db
            .select({
              id: user.id,
              name: user.name,
              email: user.email,
            })
            .from(user)
            .where(eq(user.id, requestData.assignedById))
            .limit(1)
        : Promise.resolve([])

      const currentUserPromise = requestData.requesterEmail
        ? db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, requestData.requesterEmail))
            .limit(1)
        : Promise.resolve([])

      const [servicesData, categoriesData, assignedToData, assignedByData, currentUserData] =
        await Promise.all([
          servicesPromise,
          categoriesPromise,
          assignedToPromise,
          assignedByPromise,
          currentUserPromise,
        ])

      const currentUserId = currentUserData.length > 0 ? currentUserData[0].id : null
      const {
        cargoDetailsId: _cargoDetailsId,
        organization: org,
        ...requestWithoutRelations
      } = requestData

      return {
        ...requestWithoutRelations,
        priority: calculateRequestPriority(requestData.fromDate, requestData.lifecycleStatus),
        requester: {
          id: currentUserId || '',
          name: requestData.requesterName,
          email: requestData.requesterEmail,
        },
        organization: org
          ? {
              id: org.id,
              name: org.name,
              slug: org.slug || '',
              taxIdType: org.taxIdType,
            }
          : undefined,
        assignedTo: assignedToData.length
          ? {
              id: assignedToData[0].id,
              name: assignedToData[0].name,
              email: assignedToData[0].email,
              role: assignedToData[0].role,
            }
          : undefined,
        assignedBy: assignedByData.length
          ? {
              id: assignedByData[0].id,
              name: assignedByData[0].name,
              email: assignedByData[0].email,
            }
          : undefined,
        services: servicesData,
        categories: categoriesData,
        cargoDetails: cargoDetailsData,
      }
    } catch (error) {
      throw new Error(`Failed to fetch request with relations ${id}`, { cause: error })
    }
  }

  async getByNumber(requestNumber: string): Promise<RequestWithRelations | null> {
    try {
      const result = await db
        .select({ id: requestTable.id })
        .from(requestTable)
        .where(eq(requestTable.reqNumber, requestNumber))
        .limit(1)

      if (result.length === 0) {
        return null
      }

      return await this.getByIdWithRelations(result[0].id)
    } catch (error) {
      throw new Error(`Failed to fetch request by number ${requestNumber}`, { cause: error })
    }
  }

  async getUserRequests(userId: string, filters?: RequestFilters): Promise<Request[]> {
    try {
      const whereConditions: SQL[] = [eq(requestTable.requesterId, userId)]
      this.appendLifecycleStatusFilter(whereConditions, filters?.lifecycleStatus)
      this.appendClosedReasonFilter(whereConditions, filters?.closedReason)

      if (filters?.organizationId) {
        whereConditions.push(eq(requestTable.receiverOrganizationId, filters.organizationId))
      }

      if (filters?.search?.trim()) {
        const searchTerm = filters.search.trim().toLowerCase()
        const searchCondition = or(
          like(sql`lower(${requestTable.reqNumber})`, `%${searchTerm}%`),
          like(sql`lower(${organization.name})`, `%${searchTerm}%`)
        )
        if (searchCondition) whereConditions.push(searchCondition)
      }

      this.appendDateFilters(whereConditions, filters)

      const { limit, offset } = this.getListPagination(filters)
      const results = await db
        .select({
          id: requestTable.id,
          reqNumber: requestTable.reqNumber,
          lifecycleStatus: requestTable.lifecycleStatus,
          closedReason: requestTable.closedReason,
          requesterEmail: requestTable.requesterEmail,
          requesterName: requestTable.requesterName,
          requesterPhone: requestTable.requesterPhone,
          requesterId: requestTable.requesterId,
          receiverOrganizationId: requestTable.receiverOrganizationId,
          conversationId: requestTable.conversationId,
          categories: requestTable.categories,
          services: requestTable.services,
          extraServices: requestTable.extraServices,
          cargoDetailsId: requestTable.cargoDetailsId,
          comments: requestTable.comments,
          documents: requestTable.documents,
          assignedToId: requestTable.assignedToId,
          assignedAt: requestTable.assignedAt,
          assignedById: requestTable.assignedById,
          fromDate: requestTable.fromDate,
          toDate: requestTable.toDate,
          createdAt: requestTable.createdAt,
          updatedAt: requestTable.updatedAt,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo,
            taxIdType: organization.taxIdType,
          },
        })
        .from(requestTable)
        .leftJoin(organization, eq(requestTable.receiverOrganizationId, organization.id))
        .where(and(...whereConditions))
        .orderBy(desc(requestTable.createdAt))
        .limit(limit)
        .offset(offset)

      return results as Request[]
    } catch (error) {
      throw new Error(`Failed to fetch requests for user ${userId}`, { cause: error })
    }
  }

  async findAnonymousByRequesterEmail(userEmail: string): Promise<Request[]> {
    try {
      return await db
        .select()
        .from(requestTable)
        .where(and(eq(requestTable.requesterEmail, userEmail), isNull(requestTable.requesterId)))
    } catch (error) {
      throw new Error(`Failed to fetch anonymous requests for ${userEmail}`, { cause: error })
    }
  }

  async linkAnonymousRequestToUser(
    requestId: string,
    userId: string,
    conversationId: string | null
  ): Promise<void> {
    try {
      await db
        .update(requestTable)
        .set({
          requesterId: userId,
          conversationId,
          updatedAt: new Date(),
        })
        .where(eq(requestTable.id, requestId))
    } catch (error) {
      throw new Error(`Failed to link request ${requestId} to user ${userId}`, { cause: error })
    }
  }

  async reject(requestId: string, _userId: string, _reason?: string): Promise<void> {
    await this.updateLifecycle(
      requestId,
      ERequestLifecycleStatus.CLOSED,
      ERequestClosedReason.REQUEST_REJECTED,
      'reject'
    )
  }

  async cancel(requestId: string, _userId: string): Promise<void> {
    await this.updateLifecycle(
      requestId,
      ERequestLifecycleStatus.CLOSED,
      ERequestClosedReason.CANCELLED,
      'cancel'
    )
  }

  async validateDraft(requestId: string, _userId: string): Promise<void> {
    await this.updateLifecycle(requestId, ERequestLifecycleStatus.OPEN, null, 'validate draft')
  }

  async deleteDraft(requestId: string): Promise<void> {
    try {
      await db.delete(requestTable).where(eq(requestTable.id, requestId))
    } catch (error) {
      throw new Error(`Failed to delete draft ${requestId}`, { cause: error })
    }
  }

  async removeDocument(requestId: string, documentUrl: string): Promise<void> {
    try {
      const existingRequest = await this.getById(requestId)
      if (!existingRequest) {
        throw new Error('Request not found')
      }

      if (existingRequest.documents) {
        const updatedDocuments = existingRequest.documents.filter((doc) => doc !== documentUrl)
        await db
          .update(requestTable)
          .set({ documents: updatedDocuments })
          .where(eq(requestTable.id, requestId))
      }
    } catch (error) {
      throw new Error(`Failed to remove document from request ${requestId}`, { cause: error })
    }
  }

  async assignToMember(
    requestId: string,
    assignedToId: string,
    assignedById: string
  ): Promise<void> {
    await this.updateAssignment(requestId, assignedToId, assignedById, 'assign')
  }

  async reassignToMember(
    requestId: string,
    assignedToId: string,
    assignedById: string
  ): Promise<void> {
    await this.updateAssignment(requestId, assignedToId, assignedById, 'reassign')
  }

  async unassignRequest(requestId: string): Promise<void> {
    try {
      const existingRequest = await this.getById(requestId)
      if (!existingRequest) {
        throw new Error('Request not found')
      }

      await db
        .update(requestTable)
        .set({
          assignedToId: null,
          assignedById: null,
          assignedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(requestTable.id, requestId))
    } catch (error) {
      throw new Error(`Failed to unassign request ${requestId}`, { cause: error })
    }
  }

  async getAssignedRequests(
    userId: string,
    organizationId: string,
    filters?: RequestFilters
  ): Promise<Request[]> {
    try {
      const whereConditions: SQL[] = [
        eq(requestTable.assignedToId, userId),
        eq(requestTable.receiverOrganizationId, organizationId),
      ]
      this.appendLifecycleStatusFilter(whereConditions, filters?.lifecycleStatus)
      this.appendClosedReasonFilter(whereConditions, filters?.closedReason)
      this.appendDateFilters(whereConditions, filters)

      const { limit, offset } = this.getListPagination(filters)
      return (await db
        .select()
        .from(requestTable)
        .where(and(...whereConditions))
        .orderBy(desc(requestTable.assignedAt))
        .limit(limit)
        .offset(offset)) as Request[]
    } catch (error) {
      throw new Error(`Failed to fetch assigned requests for user ${userId}`, { cause: error })
    }
  }

  async getUnassignedRequests(
    organizationId: string,
    filters?: RequestFilters
  ): Promise<Request[]> {
    try {
      const whereConditions: SQL[] = [
        eq(requestTable.receiverOrganizationId, organizationId),
        isNull(requestTable.assignedToId),
      ]
      this.appendLifecycleStatusFilter(whereConditions, filters?.lifecycleStatus)
      this.appendClosedReasonFilter(whereConditions, filters?.closedReason)
      this.appendDateFilters(whereConditions, filters)

      const { limit, offset } = this.getListPagination(filters)
      return (await db
        .select()
        .from(requestTable)
        .where(and(...whereConditions))
        .orderBy(desc(requestTable.createdAt))
        .limit(limit)
        .offset(offset)) as Request[]
    } catch (error) {
      throw new Error(`Failed to fetch unassigned requests for organization ${organizationId}`, {
        cause: error,
      })
    }
  }

  private async updateLifecycle(
    requestId: string,
    lifecycleStatus: ERequestLifecycleStatus,
    closedReason: ERequestClosedReason | null,
    actionLabel: string
  ): Promise<void> {
    try {
      await db
        .update(requestTable)
        .set({
          lifecycleStatus,
          closedReason,
          updatedAt: new Date(),
        })
        .where(eq(requestTable.id, requestId))
    } catch (error) {
      throw new Error(`Failed to ${actionLabel} request ${requestId}`, { cause: error })
    }
  }

  private async updateAssignment(
    requestId: string,
    assignedToId: string,
    assignedById: string,
    actionLabel: string
  ): Promise<void> {
    try {
      await db
        .update(requestTable)
        .set({
          assignedToId,
          assignedById,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(requestTable.id, requestId))
    } catch (error) {
      throw new Error(`Failed to ${actionLabel} request ${requestId}`, { cause: error })
    }
  }

  private appendLifecycleStatusFilter(whereConditions: SQL[], lifecycleStatus?: string): void {
    const statuses = lifecycleStatus
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) as ERequestLifecycleStatus[] | undefined

    if (!statuses?.length) return

    if (statuses.length === 1) {
      whereConditions.push(eq(requestTable.lifecycleStatus, statuses[0]))
      return
    }

    whereConditions.push(inArray(requestTable.lifecycleStatus, statuses))
  }

  private appendClosedReasonFilter(whereConditions: SQL[], closedReason?: string): void {
    const closedReasons = closedReason
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) as ERequestClosedReason[] | undefined

    if (!closedReasons?.length) return

    if (closedReasons.length === 1) {
      whereConditions.push(eq(requestTable.closedReason, closedReasons[0]))
      return
    }

    whereConditions.push(inArray(requestTable.closedReason, closedReasons))
  }

  private appendDateFilters(whereConditions: SQL[], filters?: RequestFilters): void {
    if (filters?.fromDate && filters?.toDate) {
      whereConditions.push(
        sql`(DATE(${requestTable.fromDate}) >= ${filters.fromDate} AND DATE(${requestTable.toDate}) <= ${filters.toDate})`
      )
      return
    }

    if (filters?.fromDate) {
      whereConditions.push(sql`DATE(${requestTable.fromDate}) >= ${filters.fromDate}`)
      return
    }

    if (filters?.toDate) {
      whereConditions.push(sql`DATE(${requestTable.toDate}) <= ${filters.toDate}`)
    }
  }

  private getListPagination(filters?: RequestFilters): { limit: number; offset: number } {
    const limit = filters?.limit || 20
    const page = filters?.page || 1
    return {
      limit,
      offset: (page - 1) * limit,
    }
  }

  private async createCargoDetails(
    cargoData: CreateRequestData['cargoDetails']
  ): Promise<string | null> {
    if (!cargoData) return null

    let dimensionsId: string | null = null
    if (cargoData.dimensions) {
      const [newDimensions] = await db
        .insert(dimensions)
        .values({
          id: nanoid(),
          length: cargoData.dimensions.length || null,
          width: cargoData.dimensions.width || null,
          height: cargoData.dimensions.height || null,
        })
        .returning()

      dimensionsId = newDimensions.id
    }

    const [newCargoDetails] = await db
      .insert(cargoDetails)
      .values({
        id: nanoid(),
        weight: cargoData.weight || null,
        volume: cargoData.volume || null,
        palletCount: cargoData.palletCount || null,
        fragility: (cargoData.fragility as EFragility) || null,
        options: cargoData.options || null,
        dimensionsId,
      })
      .returning()

    return newCargoDetails.id
  }

  private async updateCargoDetails(
    cargoDetailsId: string,
    cargoData: NonNullable<UpdateRequestData['cargoDetails']>
  ): Promise<void> {
    if (cargoData.dimensions) {
      const existingCargoDetails = await db
        .select()
        .from(cargoDetails)
        .where(eq(cargoDetails.id, cargoDetailsId))
        .limit(1)

      if (existingCargoDetails.length && existingCargoDetails[0].dimensionsId) {
        await db
          .update(dimensions)
          .set({
            length: cargoData.dimensions.length,
            width: cargoData.dimensions.width,
            height: cargoData.dimensions.height,
          })
          .where(eq(dimensions.id, existingCargoDetails[0].dimensionsId))
      }
    }

    await db
      .update(cargoDetails)
      .set({
        weight: cargoData.weight,
        volume: cargoData.volume,
        palletCount: cargoData.palletCount,
        fragility: cargoData.fragility as EFragility,
        options: cargoData.options,
      })
      .where(eq(cargoDetails.id, cargoDetailsId))
  }

  private buildRequestUpdateData(data: UpdateRequestData): Record<string, unknown> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (data.receiverOrganizationId) updateData.receiverOrganizationId = data.receiverOrganizationId
    if (data.categories) updateData.categories = data.categories
    if (data.services) updateData.services = data.services
    if (data.extraServices) updateData.extraServices = data.extraServices
    if (data.comments) updateData.comments = data.comments
    if (data.documents) updateData.documents = data.documents
    if (data.fromDate) updateData.fromDate = new Date(data.fromDate)
    if (data.toDate) updateData.toDate = new Date(data.toDate)

    return updateData
  }

  private async getCargoDetails(
    cargoDetailsId: string
  ): Promise<RequestWithRelations['cargoDetails']> {
    const cargoResult = await db
      .select({
        id: cargoDetails.id,
        weight: cargoDetails.weight,
        volume: cargoDetails.volume,
        palletCount: cargoDetails.palletCount,
        fragility: cargoDetails.fragility,
        options: cargoDetails.options,
        dimensions: {
          length: dimensions.length,
          width: dimensions.width,
          height: dimensions.height,
        },
      })
      .from(cargoDetails)
      .leftJoin(dimensions, eq(cargoDetails.dimensionsId, dimensions.id))
      .where(eq(cargoDetails.id, cargoDetailsId))
      .limit(1)

    if (!cargoResult.length) return null

    return {
      id: cargoResult[0].id,
      weight: cargoResult[0].weight,
      volume: cargoResult[0].volume,
      palletCount: cargoResult[0].palletCount,
      fragility: cargoResult[0].fragility,
      options: cargoResult[0].options,
      dimensions: cargoResult[0].dimensions
        ? {
            length: cargoResult[0].dimensions.length,
            width: cargoResult[0].dimensions.width,
            height: cargoResult[0].dimensions.height,
          }
        : null,
    }
  }
}
