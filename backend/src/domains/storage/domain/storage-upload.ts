export interface MultipartUploadPartLike {
  ETag: string
  PartNumber: number
}

export function generateCallRecordingKey(
  callId: string,
  conversationId: string,
  userPrefix?: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const prefix = userPrefix ? `${userPrefix}-` : ''
  return `call-recordings/${conversationId}/${callId}-${prefix}${timestamp}.webm`
}

export function validateStorageKey(key: string): boolean {
  const validPattern = /^[a-zA-Z0-9\-_/.]+$/
  return validPattern.test(key) && key.length <= 1024
}

export function cappedMultipartPartCount(maxParts: number | undefined, defaultValue = 50): number {
  return Math.min(maxParts ?? defaultValue, 100)
}

export function validateMultipartUploadParts(parts: MultipartUploadPartLike[]): void {
  for (const part of parts) {
    if (!part.ETag || !part.PartNumber) {
      throw new Error('Invalid parts format. Each part must have ETag and PartNumber')
    }
  }
}

export function buildTranscriptionPrompt(userName?: string): string {
  return userName
    ? `This is a recording from ${userName} in a multi-participant call.`
    : 'This is a call recording.'
}
