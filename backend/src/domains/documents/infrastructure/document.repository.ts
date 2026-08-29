import { S3Service } from '../../../infrastructure/storage/s3.service'
import type {
  DocumentUploadOptions,
  SignedDocumentUrl,
  UploadedDocument,
} from '../application/document-models'
import type { DocumentRepositoryPort } from '../application/ports'
import {
  documentFilenameFromUrl,
  extractDocumentKeyFromUrl,
  requestDocumentsFolder,
  validateDocumentFile,
  validateDocumentFiles,
} from '../domain'

export class S3DocumentRepository implements DocumentRepositoryPort {
  constructor(private readonly s3Service = new S3Service()) {}

  validateFile(file: File, options: DocumentUploadOptions = {}): void {
    validateDocumentFile(file, options)
  }

  async uploadDocument(file: File, options: DocumentUploadOptions = {}): Promise<UploadedDocument> {
    this.validateFile(file, options)

    try {
      const buffer = Buffer.from(await file.arrayBuffer())

      const uploadResult = await this.s3Service.uploadDocument(buffer, file.name, file.type, {
        folder: options.folder || 'documents',
      })

      return {
        url: uploadResult.url,
        filename: uploadResult.key,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      }
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error)
      throw new Error(`Failed to upload file: ${file.name}`)
    }
  }

  async uploadDocuments(
    files: File[],
    options: DocumentUploadOptions = {}
  ): Promise<UploadedDocument[]> {
    if (!files || files.length === 0) {
      return []
    }

    validateDocumentFiles(files, options)

    const uploadPromises = files.map((file) => this.uploadDocument(file, options))
    return await Promise.all(uploadPromises)
  }

  async uploadRequestDocuments(requestId: string, files: File[]): Promise<string[]> {
    const uploadedDocuments = await this.uploadDocuments(files, {
      folder: requestDocumentsFolder(requestId),
    })

    return uploadedDocuments.map((doc) => doc.url)
  }

  async deleteDocument(documentUrl: string): Promise<void> {
    try {
      const key = extractDocumentKeyFromUrl(documentUrl)
      await this.s3Service.deleteFile(key)
    } catch (error) {
      console.error('Error deleting S3 file:', error)
      throw new Error(`Failed to delete document: ${documentUrl}`)
    }
  }

  async deleteDocuments(documentUrls: string[]): Promise<void> {
    if (!documentUrls || documentUrls.length === 0) {
      return
    }

    const deletePromises = documentUrls.map((url) => this.deleteDocument(url))

    try {
      await Promise.all(deletePromises)
    } catch (error) {
      console.error('Error deleting documents:', error)
      throw error
    }
  }

  async generateSignedUrl(
    documentUrl: string,
    expiresIn = 3600,
    filename?: string
  ): Promise<string> {
    try {
      const key = extractDocumentKeyFromUrl(documentUrl)
      return await this.s3Service.getDownloadUrl(key, expiresIn, filename)
    } catch (error) {
      console.error('Error generating signed URL:', error)
      throw new Error(`Failed to generate signed URL for: ${documentUrl}`)
    }
  }

  async generateSignedUrls(documentUrls: string[], expiresIn = 3600): Promise<SignedDocumentUrl[]> {
    if (!documentUrls || documentUrls.length === 0) {
      return []
    }

    const urlPromises = documentUrls.map(async (url) => {
      const signedUrl = await this.generateSignedUrl(url, expiresIn)
      return {
        originalUrl: url,
        signedUrl,
        filename: documentFilenameFromUrl(url),
      }
    })

    return await Promise.all(urlPromises)
  }
}
