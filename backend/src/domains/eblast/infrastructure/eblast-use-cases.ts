import {
  GetEblastJobUseCase,
  ListEblastJobsUseCase,
  ListEblastTemplatesUseCase,
  StartEblastUseCase,
} from '../application/eblast-use-cases'
import { eblastProcessor } from './eblast.processor'

let eblastUseCases: {
  start: StartEblastUseCase
  getJob: GetEblastJobUseCase
  listJobs: ListEblastJobsUseCase
  listTemplates: ListEblastTemplatesUseCase
} | null = null

export async function getEblastUseCases() {
  if (!eblastUseCases) {
    eblastUseCases = {
      start: new StartEblastUseCase(eblastProcessor),
      getJob: new GetEblastJobUseCase(eblastProcessor),
      listJobs: new ListEblastJobsUseCase(eblastProcessor),
      listTemplates: new ListEblastTemplatesUseCase(eblastProcessor),
    }
  }

  return eblastUseCases
}
