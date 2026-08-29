export interface User {
  id: string
  name: string
  image: string | null
  dominantColor: string | null
  createdAt: Date
}

export interface UserProfile {
  user: User
  organization: {
    id: string
    name: string
    slug: string | null
    logo: string | null
  }
}
