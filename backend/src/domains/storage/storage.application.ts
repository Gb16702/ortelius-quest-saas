import type {
  AbortUploadRequest,
  CallRecordingUploadRequest,
  CompleteUploadRequest,
  PreSignedUploadUrls,
  SpeakerInfo,
  UploadCompleteResponse,
} from './application/storage-models'
import { getStorageUseCases } from './infrastructure/storage-use-cases'

export class StorageApplicationService {
  async generateUploadUrls(request: CallRecordingUploadRequest): Promise<PreSignedUploadUrls> {
    const useCases = await getStorageUseCases()
    return await useCases.generateUploadUrls.execute(request)
  }

  async completeUpload(
    request: CompleteUploadRequest,
    speakerInfo?: SpeakerInfo
  ): Promise<UploadCompleteResponse> {
    const useCases = await getStorageUseCases()
    return await useCases.completeUpload.execute(request, speakerInfo)
  }

  async abortUpload(request: AbortUploadRequest): Promise<{ success: boolean; message: string }> {
    const useCases = await getStorageUseCases()
    return await useCases.abortUpload.execute(request)
  }
}

export const storageApplicationService = new StorageApplicationService()
