import { s3Service } from '../../../infrastructure/storage/s3.service'
import type { OrganizationLogoStoragePort } from '../application/ports'
import type { OrganizationLogoUpload, OrganizationLogoUploadResult } from '../domain'

export class S3OrganizationLogoStorageAdapter implements OrganizationLogoStoragePort {
  async uploadLogo(upload: OrganizationLogoUpload): Promise<OrganizationLogoUploadResult> {
    const uploadResult = await s3Service.uploadImage(
      upload.buffer,
      upload.filename,
      upload.contentType,
      {
        folder: 'organization-logos',
        generateThumbnail: true,
        moderationCheck: true,
      }
    )

    return {
      logoUrl: uploadResult.original.url,
      thumbnailUrl: uploadResult.thumbnail?.url,
    }
  }

  async deleteLogoFiles(logoUrl: string): Promise<void> {
    try {
      const oldKey = logoUrl.split('/').pop()
      if (oldKey) {
        await s3Service.deleteFile(`organization-logos/${oldKey}`)
        await s3Service.deleteFile(`organization-logos/thumbs/thumb_${oldKey}`)
      }
    } catch (error) {
      console.warn('Failed to delete organization logo from S3:', error)
    }
  }
}
