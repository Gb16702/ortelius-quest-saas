export function encodeActivityCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url')
}

export function decodeActivityCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8')
    const [isoDate, id] = decoded.split('|')
    if (!isoDate || !id) return null
    return { createdAt: new Date(isoDate), id }
  } catch {
    return null
  }
}
