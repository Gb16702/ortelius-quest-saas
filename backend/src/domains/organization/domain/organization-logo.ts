export type OrganizationLogoUpload = {
  buffer: Buffer
  filename: string
  contentType: string
}

export type OrganizationLogoUploadResult = {
  logoUrl: string
  thumbnailUrl?: string
}

export type OrganizationLogoSnapshot = {
  logo: string | null
}
