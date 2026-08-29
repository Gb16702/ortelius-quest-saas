import { transcriptionQueue } from '../../calls/infrastructure/calls.services'
import type { TranscriptionQueuePort } from '../application/ports'
import type { TranscriptionJob } from '../application/storage-models'

export class CallsTranscriptionQueueAdapter implements TranscriptionQueuePort {
  async addJob(job: TranscriptionJob): Promise<void> {
    await transcriptionQueue.addJob(job)
  }
}
