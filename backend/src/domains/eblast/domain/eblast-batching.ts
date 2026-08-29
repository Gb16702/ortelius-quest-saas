export const EBLAST_BATCH_SIZE = 10
export const EBLAST_DELAY_BETWEEN_BATCHES_MS = 1000
export const EBLAST_DELAY_BETWEEN_EMAILS_MS = 100
export const EBLAST_JOB_RETENTION_MS = 24 * 60 * 60 * 1000

export type EblastJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export function chunkEblastRecipients<T>(array: T[], size = EBLAST_BATCH_SIZE): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function isEblastJobExpired(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() > EBLAST_JOB_RETENTION_MS
}

export function templateDisplayName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
