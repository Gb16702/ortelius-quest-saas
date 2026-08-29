import type { EblastRequest } from './application/eblast-models'
import { getEblastUseCases } from './infrastructure/eblast-use-cases'

export class EblastApplicationService {
  async getAvailableTemplates() {
    const useCases = await getEblastUseCases()
    return useCases.listTemplates.execute()
  }

  async listJobs() {
    const useCases = await getEblastUseCases()
    return useCases.listJobs.execute()
  }

  async getJob(jobId: string) {
    const useCases = await getEblastUseCases()
    return useCases.getJob.execute({ jobId })
  }

  async startEblast(request: EblastRequest) {
    const useCases = await getEblastUseCases()
    return useCases.start.execute(request)
  }
}

export const eblastApplicationService = new EblastApplicationService()
