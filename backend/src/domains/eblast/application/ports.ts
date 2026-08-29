import type { EblastJob, EblastRequest, EblastTemplateOption } from './eblast-models'

export interface EblastProcessorPort {
  startEblast(request: EblastRequest): EblastJob
  getJob(jobId: string): EblastJob | undefined
  listJobs(): EblastJob[]
  getAvailableTemplates(): EblastTemplateOption[]
}
