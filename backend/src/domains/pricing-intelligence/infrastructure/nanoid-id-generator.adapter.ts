import { nanoid } from 'nanoid'
import type { IdGeneratorPort } from '../application/ports'

export class NanoidIdGeneratorAdapter implements IdGeneratorPort {
  generate(): string {
    return nanoid()
  }
}
