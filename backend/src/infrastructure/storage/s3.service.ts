import crypto from 'node:crypto'
import { DetectModerationLabelsCommand, RekognitionClient } from '@aws-sdk/client-rekognition'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandInput,
  ListObjectsV2Command,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import { env } from '../config/environment'

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_S3_SECRET_ACCESS_KEY,
  },
})

const rekognitionClient = new RekognitionClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_S3_SECRET_ACCESS_KEY,
  },
})

export interface UploadResult {
  key: string
  url: string
  size: number
}

export interface ImageVariants {
  original: UploadResult
  thumbnail?: UploadResult
  medium?: UploadResult
}

export interface UploadOptions {
  folder?: string
  generateThumbnail?: boolean
  moderationCheck?: boolean
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const

function generateKey(extension: string, folder?: string): string {
  const key = `${crypto.randomBytes(16).toString('hex')}.${extension}`
  return folder ? `${folder}/${key}` : key
}

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export class S3Service {
  async uploadDocument(
    buffer: Buffer,
    filename: string,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const allowedTypes = [...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_IMAGE_TYPES]
    if (
      !allowedTypes.includes(
        contentType as
          | (typeof ALLOWED_DOCUMENT_TYPES)[number]
          | (typeof ALLOWED_IMAGE_TYPES)[number]
      )
    ) {
      throw new Error(`File type not allowed: ${contentType}`)
    }

    const extension = getExtension(filename)
    const key = generateKey(extension, options.folder)

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000',
        Metadata: {
          'original-filename': filename,
          'upload-date': new Date().toISOString(),
        },
      },
    })

    const result = await upload.done()

    return {
      key,
      url: result.Location!,
      size: buffer.length,
    }
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<ImageVariants> {
    if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new Error(`Image type not allowed: ${contentType}`)
    }

    if (options.moderationCheck && (await this.hasInappropriateContent(buffer))) {
      throw new Error('Inappropriate content detected')
    }

    const variants: ImageVariants = {
      original: await this.uploadDocument(buffer, filename, contentType, options),
    }

    if (options.generateThumbnail) {
      const thumbnailBuffer = await this.createThumbnail(buffer)
      variants.thumbnail = await this.uploadDocument(
        thumbnailBuffer,
        `thumb_${filename}`,
        'image/jpeg',
        { ...options, folder: options.folder ? `${options.folder}/thumbs` : 'thumbs' }
      )
    }

    return variants
  }

  private async createThumbnail(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
  }

  async extractDominantColor(buffer: Buffer): Promise<string | null> {
    try {
      const { dominant } = await sharp(buffer).stats()
      const { r, g, b } = dominant
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    } catch {
      return null
    }
  }

  private async hasInappropriateContent(buffer: Buffer): Promise<boolean> {
    try {
      const command = new DetectModerationLabelsCommand({
        Image: { Bytes: buffer },
        MinConfidence: 80,
      })

      const response = await rekognitionClient.send(command)
      return Boolean(response.ModerationLabels && response.ModerationLabels.length > 0)
    } catch {
      return false
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
    })
    await s3Client.send(command)
  }

  async deleteImageVariants(variants: ImageVariants): Promise<void> {
    const promises = [this.deleteFile(variants.original.key)]

    if (variants.thumbnail) {
      promises.push(this.deleteFile(variants.thumbnail.key))
    }
    if (variants.medium) {
      promises.push(this.deleteFile(variants.medium.key))
    }

    await Promise.allSettled(promises)
  }

  async getDownloadUrl(key: string, expiresIn = 3600, filename?: string): Promise<string> {
    const commandParams: GetObjectCommandInput = {
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
    }

    if (filename) {
      commandParams.ResponseContentDisposition = `attachment; filename="${filename}"`
    }

    const command = new GetObjectCommand(commandParams)
    return getSignedUrl(s3Client, command, { expiresIn })
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
    options: { cacheControl?: string; metadata?: Record<string, string> } = {}
  ): Promise<UploadResult> {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: options.cacheControl || 'max-age=31536000',
        Metadata: options.metadata || {
          'upload-date': new Date().toISOString(),
        },
      },
    })

    const result = await upload.done()

    return {
      key,
      url: result.Location!,
      size: buffer.length,
    }
  }

  async listFiles(
    prefix: string
  ): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const command = new ListObjectsV2Command({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Prefix: prefix,
    })

    const response = await s3Client.send(command)

    return (response.Contents || []).map((item) => ({
      key: item.Key!,
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    }))
  }

  async createMultipartUpload(
    key: string,
    contentType: string
  ): Promise<{ uploadId: string; key: string }> {
    const command = new CreateMultipartUploadCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })
    const response = await s3Client.send(command)
    if (!response.UploadId) {
      throw new Error('Failed to initiate multipart upload')
    }
    return { uploadId: response.UploadId, key }
  }

  async getPresignedPartUrls(
    uploadId: string,
    key: string,
    partCount: number,
    expiresIn = 15 * 60
  ): Promise<Array<{ partNumber: number; url: string }>> {
    if (partCount < 1 || partCount > 10000) {
      throw new Error(`Invalid part count: ${partCount}`)
    }
    const urls: Array<{ partNumber: number; url: string }> = []
    for (let i = 1; i <= partCount; i++) {
      const command = new UploadPartCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: i,
      })
      const url = await getSignedUrl(s3Client, command, { expiresIn })
      urls.push({ partNumber: i, url })
    }
    return urls
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<string> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    })
    await s3Client.send(command)
    return `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`
  }

  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    })
    await s3Client.send(command)
  }

  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      throw new Error('File not found')
    }

    const chunks: Uint8Array[] = []
    const stream = response.Body as AsyncIterable<Uint8Array>
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  }
}

export const s3Service = new S3Service()
