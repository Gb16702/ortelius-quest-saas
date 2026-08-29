export const appShellTypeDefs = /* GraphQL */ `
  enum ShellOrganizationRole {
    member
    admin
    owner
  }

  type ShellActiveOrganization {
    id: String!
    name: String!
    slug: String
    logo: String
  }

  type Viewer {
    id: String!
    email: String!
    name: String!
    image: String
    activeOrganization: ShellActiveOrganization
  }

  type ShellOrganization {
    id: String!
    name: String!
    slug: String!
    logo: String
    brandColor: String!
    font: String!
    currentUserRole: ShellOrganizationRole!
  }

  extend type Query {
    viewer: Viewer
    organizationBySlug(slug: String!): ShellOrganization
  }
`
