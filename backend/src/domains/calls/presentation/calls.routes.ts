import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import {
  validateJson,
  validateParam,
  validateQuery,
} from '../../../infrastructure/validation/validation.utils'
import type { CallParticipant } from '../domain/calls.types'
import { CallLifecycleError, callLifecycleService } from '../infrastructure/call-lifecycle.service'
import { callMetricsService } from '../infrastructure/call-metrics.service'
import { callRecordingUseCases } from '../infrastructure/call-recording.adapters'
import {
  callSessionService,
  callSummaryService,
  transcriptionQueue,
  transcriptionService,
} from '../infrastructure/calls.services'
import {
  abortRecordingUploadSchema,
  addParticipantSchema,
  callHistoryQuerySchema,
  callIdParamSchema,
  completeRecordingUploadSchema,
  conversationIdParamSchema,
  generateSummarySchema,
  initiateCallSchema,
  initiateRecordingUploadSchema,
  jobIdParamSchema,
  metricsBatchSchema,
  removeParticipantSchema,
  startCallSchema,
  transcribeAudioSchema,
  transcriptIdParamSchema,
  transcriptionJobSchema,
  updateCallStatusSchema,
} from './calls.schemas'

const callsRoutes = new Hono<{ Variables: CommonVariables }>()

callsRoutes.post('/sessions', validateJson(startCallSchema), async (c) => {
  try {
    const { callId, conversationId, participants } = c.req.valid('json')

    callSessionService.startCall(callId, conversationId, participants)

    const response: ApiResponse<{ callId: string; status: string }> = {
      success: true,
      data: {
        callId,
        status: 'active',
      },
      message: 'Call started successfully',
    }

    return c.json(response, 201)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to start call'
    )
    return c.json(response, 500)
  }
})

callsRoutes.get('/sessions/:callId', validateParam(callIdParamSchema), async (c) => {
  try {
    const { callId } = c.req.valid('param')

    const call = callSessionService.getCall(callId)

    if (!call) {
      const response: ApiResponse = createApiErrorResponse(ErrorCode.NOT_FOUND, 'Call not found')
      return c.json(response, 404)
    }

    const response: ApiResponse<{
      callId: string
      conversationId: string
      startedAt: Date
      status: string
      participants: CallParticipant[]
    }> = {
      success: true,
      data: {
        callId: call.callId,
        conversationId: call.conversationId,
        startedAt: call.startedAt,
        status: call.status,
        participants: Array.from(call.participants.values()),
      },
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to get call'
    )
    return c.json(response, 500)
  }
})

callsRoutes.post(
  '/sessions/:callId/participants',
  validateParam(callIdParamSchema),
  validateJson(addParticipantSchema),
  async (c) => {
    try {
      const { callId } = c.req.valid('param')
      const { participant } = c.req.valid('json')

      const success = callSessionService.addParticipant(callId, participant)

      if (!success) {
        const response: ApiResponse = createApiErrorResponse(ErrorCode.NOT_FOUND, 'Call not found')
        return c.json(response, 404)
      }

      const response: ApiResponse<{ participant: typeof participant }> = {
        success: true,
        data: { participant },
        message: 'Participant added successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to add participant'
      )
      return c.json(response, 500)
    }
  }
)

callsRoutes.delete(
  '/sessions/:callId/participants',
  validateParam(callIdParamSchema),
  validateJson(removeParticipantSchema),
  async (c) => {
    try {
      const { callId } = c.req.valid('param')
      const { userId } = c.req.valid('json')

      const success = callSessionService.removeParticipant(callId, userId)

      if (!success) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.NOT_FOUND,
          'Call or participant not found'
        )
        return c.json(response, 404)
      }

      const response: ApiResponse<Record<string, never>> = {
        success: true,
        data: {},
        message: 'Participant removed successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to remove participant'
      )
      return c.json(response, 500)
    }
  }
)

callsRoutes.post('/sessions/:callId/end', validateParam(callIdParamSchema), async (c) => {
  try {
    const { callId } = c.req.valid('param')

    callSessionService.endCall(callId)

    const response: ApiResponse<Record<string, never>> = {
      success: true,
      data: {},
      message: 'Call ended successfully',
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to end call'
    )
    return c.json(response, 500)
  }
})

callsRoutes.get('/sessions', async (c) => {
  try {
    const activeCalls = callSessionService.getActiveCalls()

    const response: ApiResponse<{ activeCalls: string[]; count: number }> = {
      success: true,
      data: {
        activeCalls,
        count: activeCalls.length,
      },
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to get active calls'
    )
    return c.json(response, 500)
  }
})

callsRoutes.post('/transcribe', validateJson(transcribeAudioSchema), async (c) => {
  try {
    const { audioKey, callId, conversationId, options, speakerInfo } = c.req.valid('json')

    const result = await transcriptionService.transcribeAudioFile(
      audioKey,
      callId,
      conversationId,
      options,
      speakerInfo
    )

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Audio transcribed successfully',
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to transcribe audio'
    )
    return c.json(response, 500)
  }
})

callsRoutes.get('/transcripts/:transcriptId', validateParam(transcriptIdParamSchema), async (c) => {
  try {
    const { transcriptId } = c.req.valid('param')

    const transcript = await transcriptionService.getTranscript(transcriptId)

    const response: ApiResponse<typeof transcript> = {
      success: true,
      data: transcript,
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to get transcript'
    )
    return c.json(response, 500)
  }
})

callsRoutes.get(
  '/transcripts/conversation/:conversationId',
  validateParam(conversationIdParamSchema),
  async (c) => {
    try {
      const { conversationId } = c.req.valid('param')

      const transcripts = await transcriptionService.getTranscriptsByConversation(conversationId)

      const response: ApiResponse<{ transcripts: typeof transcripts; count: number }> = {
        success: true,
        data: {
          transcripts,
          count: transcripts.length,
        },
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to get conversation transcripts'
      )
      return c.json(response, 500)
    }
  }
)

callsRoutes.get('/transcripts/call/:callId', validateParam(callIdParamSchema), async (c) => {
  try {
    const { callId } = c.req.valid('param')

    const transcript = await transcriptionService.getTranscriptByCall(callId)

    if (!transcript) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.NOT_FOUND,
        'Transcript not found'
      )
      return c.json(response, 404)
    }

    const response: ApiResponse<typeof transcript> = {
      success: true,
      data: transcript,
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to get call transcript'
    )
    return c.json(response, 500)
  }
})

callsRoutes.delete(
  '/transcripts/:transcriptId',
  requireAuthMiddleware,
  validateParam(transcriptIdParamSchema),
  async (c) => {
    try {
      const { transcriptId } = c.req.valid('param')

      await transcriptionService.deleteTranscript(transcriptId)

      const response: ApiResponse<Record<string, never>> = {
        success: true,
        data: {},
        message: 'Transcript deleted successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to delete transcript'
      )
      return c.json(response, 500)
    }
  }
)

callsRoutes.post('/queue/jobs', validateJson(transcriptionJobSchema), async (c) => {
  try {
    const job = c.req.valid('json')

    await transcriptionQueue.addJob(job)

    const response: ApiResponse<{ jobId: string }> = {
      success: true,
      data: { jobId: job.id },
      message: 'Transcription job added to queue',
    }

    return c.json(response, 201)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to add job to queue'
    )
    return c.json(response, 500)
  }
})

callsRoutes.get('/queue/jobs/:jobId', validateParam(jobIdParamSchema), async (c) => {
  try {
    const { jobId } = c.req.valid('param')

    const status = await transcriptionQueue.getJobStatus(jobId)

    if (!status) {
      const response: ApiResponse = createApiErrorResponse(ErrorCode.NOT_FOUND, 'Job not found')
      return c.json(response, 404)
    }

    const response: ApiResponse<typeof status> = {
      success: true,
      data: status,
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to get job status'
    )
    return c.json(response, 500)
  }
})

callsRoutes.get('/queue/stats', async (c) => {
  try {
    const stats = await transcriptionQueue.getQueueStats()

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to get queue stats'
    )
    return c.json(response, 500)
  }
})

callsRoutes.post('/queue/jobs/:jobId/retry', validateParam(jobIdParamSchema), async (c) => {
  try {
    const { jobId } = c.req.valid('param')

    await transcriptionQueue.retryFailedJob(jobId)

    const response: ApiResponse<Record<string, never>> = {
      success: true,
      data: {},
      message: 'Job retry queued successfully',
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to retry job'
    )
    return c.json(response, 500)
  }
})

callsRoutes.post('/summary', validateJson(generateSummarySchema), async (c) => {
  try {
    const { callId, conversationId } = c.req.valid('json')

    const summaryKey = await callSummaryService.generateCallSummary(callId, conversationId)

    const response: ApiResponse<{ summaryKey: string }> = {
      success: true,
      data: { summaryKey },
      message: 'Call summary generated successfully',
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to generate call summary'
    )
    return c.json(response, 500)
  }
})

callsRoutes.get(
  '/summary/:callId',
  requireAuthMiddleware,
  validateParam(callIdParamSchema),
  async (c) => {
    try {
      const { callId } = c.req.valid('param')
      const authUser = c.get('user')

      if (!authUser) {
        return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
      }

      const result = await callSummaryService.getSummaryPDF(callId)

      if (!result) {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Summary not found'), 404)
      }

      const { buffer, filename } = result

      c.header('Content-Type', 'application/pdf')
      c.header('Content-Disposition', `attachment; filename="${filename}"`)
      c.header('Content-Length', buffer.length.toString())

      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.length.toString(),
        },
      })
    } catch (error) {
      console.error('Failed to get summary PDF:', error)
      return c.json(
        createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to get summary PDF'),
        500
      )
    }
  }
)

callsRoutes.post('/upload-chunk', requireAuthMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody()
    const audioFile = body.audio
    const callId = body.callId as string
    const conversationId = body.conversationId as string
    const userId = body.userId as string
    const chunkIndex = body.chunkIndex as string

    if (!audioFile || !(audioFile instanceof File)) {
      return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'No audio file provided'), 400)
    }

    if (!callId || !conversationId || !userId || !chunkIndex) {
      return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Missing required fields'), 400)
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { chunkKey } = await callRecordingUseCases.uploadChunk({
      callId,
      conversationId,
      userId,
      chunkIndex,
      buffer,
    })

    return c.json({
      success: true,
      data: { chunkKey },
    })
  } catch (error) {
    console.error('Failed to upload chunk:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to upload chunk'),
      500
    )
  }
})

callsRoutes.post('/complete-recording', requireAuthMiddleware, async (c) => {
  try {
    const { callId, conversationId, userId, totalChunks } = await c.req.json()

    if (!callId || !conversationId || !userId || totalChunks === undefined) {
      return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Missing required fields'), 400)
    }

    await callRecordingUseCases.completeLegacyRecording({
      callId,
      conversationId,
      userId,
      totalChunks,
    })

    return c.json({
      success: true,
      message: 'Recording marked as complete',
    })
  } catch (error) {
    console.error('Failed to complete recording:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to complete recording'),
      500
    )
  }
})

// ---------------------------------------------------------------------------
// ICE servers (TURN/STUN) for WebRTC clients
// ---------------------------------------------------------------------------

callsRoutes.get('/ice-servers', requireAuthMiddleware, async (c) => {
  const authUser = c.get('user')
  if (!authUser) return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  const result = callRecordingUseCases.getIceServers(authUser.id)
  const response: ApiResponse<typeof result> = { success: true, data: result }
  return c.json(response, 200)
})

// ---------------------------------------------------------------------------
// Persisted call lifecycle (initiate / accept / reject / end / missed)
// ---------------------------------------------------------------------------

const mapLifecycleError = (
  err: unknown
): { status: 400 | 403 | 404 | 409 | 500; body: ApiResponse } => {
  if (err instanceof CallLifecycleError) {
    const status: 400 | 403 | 404 | 409 =
      err.code === 'NOT_FOUND'
        ? 404
        : err.code === 'FORBIDDEN'
          ? 403
          : err.code === 'INVALID_STATE'
            ? 409
            : 400
    const code =
      err.code === 'NOT_FOUND'
        ? 'NOT_FOUND'
        : err.code === 'FORBIDDEN'
          ? 'FORBIDDEN'
          : err.code === 'INVALID_STATE'
            ? 'CONFLICT'
            : 'VALIDATION_ERROR'
    return {
      status,
      body: createApiErrorResponse(code, err.message, { reason: err.code }),
    }
  }
  return {
    status: 500,
    body: createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An internal server error occurred'
    ),
  }
}

callsRoutes.post('/', requireAuthMiddleware, validateJson(initiateCallSchema), async (c) => {
  const authUser = c.get('user')
  if (!authUser) return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  const body = c.req.valid('json')
  try {
    const call = await callLifecycleService.initiate({
      callerId: authUser.id,
      // Schema permits null (org calls) or undefined; the lifecycle service
      // only models undefined as "no specific callee".
      calleeId: body.calleeId ?? undefined,
      conversationId: body.conversationId,
      callType: body.callType,
    })
    return c.json({ success: true, data: call }, 201)
  } catch (err) {
    const { status, body: errorBody } = mapLifecycleError(err)
    return c.json(errorBody, status)
  }
})

callsRoutes.get('/active', requireAuthMiddleware, async (c) => {
  const authUser = c.get('user')
  if (!authUser) return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  const calls = await callLifecycleService.getActive(authUser.id)
  return c.json({ success: true, data: calls }, 200)
})

callsRoutes.get(
  '/history',
  requireAuthMiddleware,
  validateQuery(callHistoryQuerySchema),
  async (c) => {
    const authUser = c.get('user')
    if (!authUser)
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    const query = c.req.valid('query')
    const result = await callLifecycleService.getHistory({
      userId: authUser.id,
      status: query.status,
      page: query.page,
      limit: query.limit,
    })
    return c.json({ success: true, data: result }, 200)
  }
)

callsRoutes.get('/:callId', requireAuthMiddleware, validateParam(callIdParamSchema), async (c) => {
  const authUser = c.get('user')
  if (!authUser) return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  const { callId } = c.req.valid('param')
  try {
    const call = await callLifecycleService.getById(callId, authUser.id)
    return c.json({ success: true, data: call }, 200)
  } catch (err) {
    const { status, body } = mapLifecycleError(err)
    return c.json(body, status)
  }
})

callsRoutes.patch(
  '/:callId',
  requireAuthMiddleware,
  validateParam(callIdParamSchema),
  validateJson(updateCallStatusSchema),
  async (c) => {
    const authUser = c.get('user')
    if (!authUser)
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    const { callId } = c.req.valid('param')
    const { status } = c.req.valid('json')
    try {
      const call =
        status === 'accepted'
          ? await callLifecycleService.accept(callId, authUser.id)
          : status === 'rejected'
            ? await callLifecycleService.reject(callId, authUser.id)
            : status === 'ended'
              ? await callLifecycleService.end(callId, authUser.id)
              : await callLifecycleService.markMissed(callId, authUser.id)
      return c.json({ success: true, data: call }, 200)
    } catch (err) {
      const { status: code, body } = mapLifecycleError(err)
      return c.json(body, code)
    }
  }
)

// ---------------------------------------------------------------------------
// Recording — S3 multipart presigned upload
// ---------------------------------------------------------------------------

callsRoutes.post(
  '/:callId/recording/initiate',
  requireAuthMiddleware,
  validateParam(callIdParamSchema),
  validateJson(initiateRecordingUploadSchema),
  async (c) => {
    const authUser = c.get('user')
    if (!authUser)
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    const { callId } = c.req.valid('param')
    const body = c.req.valid('json')
    try {
      const data = await callRecordingUseCases.initiateMultipart({
        callId,
        userId: authUser.id,
        speakerId: body.speakerId,
        contentType: body.contentType,
        estimatedParts: body.estimatedParts,
      })
      return c.json({ success: true, data }, 200)
    } catch (err) {
      const { status, body: errorBody } = mapLifecycleError(err)
      return c.json(errorBody, status)
    }
  }
)

callsRoutes.post(
  '/:callId/recording/complete',
  requireAuthMiddleware,
  validateParam(callIdParamSchema),
  validateJson(completeRecordingUploadSchema),
  async (c) => {
    const authUser = c.get('user')
    if (!authUser)
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    const { callId } = c.req.valid('param')
    const body = c.req.valid('json')
    try {
      const data = await callRecordingUseCases.completeMultipart({
        callId,
        userId: authUser.id,
        uploadId: body.uploadId,
        key: body.key,
        parts: body.parts,
      })
      return c.json({ success: true, data }, 200)
    } catch (err) {
      const { status, body: errorBody } = mapLifecycleError(err)
      return c.json(errorBody, status)
    }
  }
)

callsRoutes.post(
  '/:callId/recording/abort',
  requireAuthMiddleware,
  validateParam(callIdParamSchema),
  validateJson(abortRecordingUploadSchema),
  async (c) => {
    const authUser = c.get('user')
    if (!authUser)
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    const { callId } = c.req.valid('param')
    const body = c.req.valid('json')
    try {
      await callRecordingUseCases.abortMultipart({
        callId,
        userId: authUser.id,
        uploadId: body.uploadId,
        key: body.key,
      })
      return c.json({ success: true, data: {} }, 200)
    } catch (err) {
      const { status, body: errorBody } = mapLifecycleError(err)
      return c.json(errorBody, status)
    }
  }
)

callsRoutes.get(
  '/:callId/transcript/download',
  requireAuthMiddleware,
  validateParam(callIdParamSchema),
  async (c) => {
    const authUser = c.get('user')
    if (!authUser)
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    const { callId } = c.req.valid('param')
    try {
      const data = await callRecordingUseCases.getTranscriptDownload({
        callId,
        userId: authUser.id,
      })
      if (!data) {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Transcript PDF not found'), 404)
      }
      return c.json({ success: true, data }, 200)
    } catch (err) {
      const { status, body } = mapLifecycleError(err)
      return c.json(body, status)
    }
  }
)

callsRoutes.post(
  '/:callId/metrics',
  requireAuthMiddleware,
  validateParam(callIdParamSchema),
  validateJson(metricsBatchSchema),
  async (c) => {
    try {
      const authUser = c.get('user')!
      const { callId } = c.req.valid('param')
      const { samples } = c.req.valid('json')
      const stored = await callMetricsService.storeBatch(callId, authUser.id, samples)
      return c.json({ success: true, data: { stored } } as ApiResponse, 200)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to store metrics'
      const status = msg === 'Call not found' ? 404 : msg === 'Not a participant' ? 403 : 500
      const code =
        status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR'
      const message = status === 500 ? 'Failed to store metrics' : msg
      return c.json(createApiErrorResponse(code, message) as ApiResponse, status)
    }
  }
)

export default callsRoutes
