import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../../../infrastructure/config/environment'
import type { StorageRepositoryPort } from '../application/ports'
import type {
  MultipartUploadPart,
  PreSignedUploadUrls,
  PreSignedUrlOptions,
} from '../application/storage-models'

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_S3_SECRET_ACCESS_KEY,
  },
})

export class S3StorageAdapter implements StorageRepositoryPort {
  private readonly bucketName: string

  constructor() {
    this.bucketName = env.AWS_S3_BUCKET_NAME
  }

  async generateMultipartUploadUrls(
    key: string,
    options: PreSignedUrlOptions = {}
  ): Promise<PreSignedUploadUrls> {
    const { expiresIn = 3600, contentType = 'audio/webm', maxParts = 100 } = options

    try {
      const createMultipartCommand = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        Metadata: {
          'upload-type': 'call-recording-streaming',
          'created-at': new Date().toISOString(),
        },
      })

      const multipartUpload = await s3Client.send(createMultipartCommand)

      if (!multipartUpload.UploadId) {
        throw new Error('Failed to create multipart upload')
      }

      const partUrls: string[] = []

      for (let partNumber = 1; partNumber <= maxParts; partNumber++) {
        const uploadPartCommand = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: key,
          PartNumber: partNumber,
          UploadId: multipartUpload.UploadId,
        })

        const signedUrl = await getSignedUrl(s3Client, uploadPartCommand, {
          expiresIn,
        })
        partUrls.push(signedUrl)
      }

      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: multipartUpload.UploadId,
      })

      const completeUrl = await getSignedUrl(s3Client, completeCommand, {
        expiresIn,
      })

      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: multipartUpload.UploadId,
      })

      const abortUrl = await getSignedUrl(s3Client, abortCommand, {
        expiresIn,
      })

      return {
        uploadId: multipartUpload.UploadId,
        key,
        urls: partUrls,
        completeUrl,
        abortUrl,
      }
    } catch (error) {
      console.error('Failed to generate pre-signed URLs:', error)
      throw new Error(
        `Failed to generate pre-signed URLs: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: MultipartUploadPart[]
  ): Promise<string> {
    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })

      const result = await s3Client.send(command)
      return result.Location || `s3://${this.bucketName}/${key}`
    } catch (error) {
      console.error('Failed to complete multipart upload:', error)
      throw new Error(
        `Failed to complete upload: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      })

      await s3Client.send(command)
    } catch (error) {
      console.error('Failed to abort multipart upload:', error)
      throw new Error(
        `Failed to abort upload: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
