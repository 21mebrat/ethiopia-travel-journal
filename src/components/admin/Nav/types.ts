/**
 * Serializable data passed from the server Nav component to the client
 * dashboard-01 style sidebar. Nothing here may contain functions or class
 * instances because it crosses the RSC boundary.
 */

export type NavEntityType = 'collections' | 'globals'

export type NavEntity = {
  slug: string
  type: NavEntityType
  /** Already translated for the active admin language. */
  label: string
  href: string
}

export type NavGroup = {
  /** Payload `admin.group` label, already translated. */
  label: string
  entities: NavEntity[]
}

export type NavUserData = {
  name: string
  email: string
  initials: string
  avatarUrl?: string
  role?: string
}

export type NavCreatePermissions = {
  article: boolean
  media: boolean
}
