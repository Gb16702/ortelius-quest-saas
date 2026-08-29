import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { env } from '../config/environment'

const ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY, 'utf-8').subarray(0, 32)

export interface EncryptedData {
  encrypted: string
  iv: string
  tag: string
}

export const encrypt = (text: string): EncryptedData => {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  }
}

export const decrypt = (encryptedData: EncryptedData): string => {
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(encryptedData.iv, 'hex'))
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export const encryptContent = (content: string): string => {
  const encrypted = encrypt(content)
  return JSON.stringify(encrypted)
}

export const decryptContent = (encryptedContent: string): string => {
  try {
    const encryptedData: EncryptedData = JSON.parse(encryptedContent)
    return decrypt(encryptedData)
  } catch (_error) {
    return encryptedContent
  }
}
