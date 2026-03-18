export interface IJWT {
  iss: string
  sub: string
  aud: string
  exp: number
  iat: number
  email: string
  phone: string
  app_metadata: AppMetadata
  user_metadata: UserMetadata
  role: string
  aal: string
  amr: Amr[]
  session_id: string
  is_anonymous: boolean
}

export interface AppMetadata {
  provider: string
  providers: string[]
}

export interface UserMetadata {
  avatar_url: string
  email: string
  email_verified: boolean
  full_name: string
  iss: string
  name: string
  phone_verified: boolean
  picture: string
  provider_id: string
  sub: string
}

export interface Amr {
  method: string
  timestamp: number
}
