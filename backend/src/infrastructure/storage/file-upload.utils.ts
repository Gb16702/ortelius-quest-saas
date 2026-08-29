import type { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { v4 as uuidv4 } from 'uuid'

export const FILE_TYPES = {
  DOCUMENTS: {
    mimeTypes: ['application/pdf'] as string[],
    extensions: ['.pdf'] as string[],
    maxSize: 10 * 1024 * 1024,
    folder: 'documents',
  },
  IMAGES: {
    mimeTypes: ['image/jpeg', 'image/png'] as string[],
    extensions: ['.jpg', '.jpeg', '.png'] as string[],
    maxSize: 5 * 1024 * 1024,
    folder: 'images',
  },
  AVATARS: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'] as string[],
    maxSize: 3 * 1024 * 1024,
    folder: 'avatars',
  },
  BANNERS: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'] as string[],
    maxSize: 5 * 1024 * 1024,
    folder: 'banners',
  },
  CHAT_ATTACHMENTS: {
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as string[],
    extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'] as string[],
    maxSize: 10 * 1024 * 1024,
    folder: 'chat-attachments',
  },
}

export type FileType = keyof typeof FILE_TYPES

interface FileValidationResult {
  valid: boolean
  error?: string
}

interface MulterFile {
  originalname: string
  mimetype: string
  buffer: Buffer
  size: number
}

export function validateFile(file: File | MulterFile, fileType: FileType): FileValidationResult {
  const config = FILE_TYPES[fileType]

  if (file.size > config.maxSize) {
    const maxSizeMB = config.maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    }
  }

  const mimeType: string = 'mimetype' in file ? file.mimetype : file.type
  if (!config.mimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${config.mimeTypes.join(', ')}`,
    }
  }

  const fileName = 'originalname' in file ? file.originalname : file.name
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  if (!config.extensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${config.extensions.join(', ')}`,
    }
  }

  return { valid: true }
}

export function generateFileKey(fileType: FileType, originalName: string): string {
  const config = FILE_TYPES[fileType]
  const timestamp = Date.now()
  const uniqueId = uuidv4()
  const extension = originalName.substring(originalName.lastIndexOf('.'))

  return `${config.folder}/${timestamp}-${uniqueId}${extension}`
}

interface UploadResult {
  url: string
  key: string
}

export async function uploadToS3(
  s3Client: S3Client,
  bucketName: string,
  file: MulterFile,
  fileType: FileType
): Promise<UploadResult> {
  const validation = validateFile(file, fileType)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const key = generateFileKey(fileType, file.originalname)

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: fileType === 'DOCUMENTS' ? 'inline' : undefined,
    },
  })

  await upload.done()

  const url = `https://${bucketName}.s3.amazonaws.com/${key}`

  return { url, key }
}

export async function uploadMultipleToS3(
  s3Client: S3Client,
  bucketName: string,
  files: MulterFile[],
  fileType: FileType
): Promise<UploadResult[]> {
  const uploadPromises = files.map((file) => uploadToS3(s3Client, bucketName, file, fileType))

  return Promise.all(uploadPromises)
}
