import type { EblastRequest } from './eblast-models'
import type { EblastProcessorPort } from './ports'

export class StartEblastUseCase {
  constructor(private readonly processor: EblastProcessorPort) {}

  execute(request: EblastRequest) {
    return this.processor.startEblast(request)
  }
}

export class GetEblastJobUseCase {
  constructor(private readonly processor: EblastProcessorPort) {}

  execute(command: { jobId: string }) {
    return this.processor.getJob(command.jobId)
  }
}

export class ListEblastJobsUseCase {
  constructor(private readonly processor: EblastProcessorPort) {}

  execute() {
    return this.processor.listJobs()
  }
}

export class ListEblastTemplatesUseCase {
  constructor(private readonly processor: EblastProcessorPort) {}

  execute() {
    return this.processor.getAvailableTemplates()
  }
}
