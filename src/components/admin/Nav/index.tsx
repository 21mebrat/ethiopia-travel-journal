import { getTranslation } from '@payloadcms/translations'
import {
  EntityType,
  formatAdminURL,
  groupNavItems,
  type EntityToGroup,
} from '@payloadcms/ui/shared'
import type { PayloadRequest, ServerProps } from 'payload'

import type { Media, User } from '@/payload-types'

import AdminNav from './AdminNav'
import type { NavCreatePermissions, NavGroup, NavUserData } from './types'

type NavProps = ServerProps & {
  req?: PayloadRequest
}

function getInitials(name: string, email: string): string {
  const fromName = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return fromName || email.slice(0, 2).toUpperCase()
}

export default async function Nav({
  i18n,
  payload,
  permissions,
  user,
  visibleEntities,
  viewType,
}: NavProps) {
  if (!payload?.config) {
    return null
  }

  const {
    routes: { admin: adminRoute },
    collections,
    globals,
  } = payload.config

  // Mirror Payload's own nav filtering: only entities visible to this user,
  // then let `groupNavItems` apply read permissions and admin grouping.
  const visibleCollections = new Set(visibleEntities?.collections ?? [])
  const visibleGlobals = new Set(visibleEntities?.globals ?? [])

  const entities: EntityToGroup[] = [
    ...collections
      .filter(({ slug }) => visibleCollections.has(slug))
      .map(
        (collection): EntityToGroup => ({
          entity: collection,
          type: EntityType.collection,
        }),
      ),
    ...globals
      .filter(({ slug }) => visibleGlobals.has(slug))
      .map(
        (global): EntityToGroup => ({
          entity: global,
          type: EntityType.global,
        }),
      ),
  ]

  const groups = groupNavItems(
    entities,
    permissions ?? ({} as NonNullable<typeof permissions>),
    i18n,
  )

  const navGroups: NavGroup[] = groups.map((group) => ({
    label: group.label,
    entities: group.entities.map((entity) => ({
      slug: entity.slug,
      type: entity.type,
      label: getTranslation(entity.label, i18n),
      href: formatAdminURL({
        adminRoute,
        path:
          entity.type === EntityType.collection
            ? `/collections/${entity.slug}`
            : `/globals/${entity.slug}`,
      }),
    })),
  }))

  const currentUser = user as User | undefined
  const fullName =
    currentUser?.displayName?.trim() ||
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
    ''
  const email = currentUser?.email ?? ''
  const name = fullName || email || 'User'

  const avatar = currentUser?.avatar
  const avatarUrl =
    typeof avatar === 'object' && avatar !== null
      ? (avatar as Media).url ?? (avatar as Media).thumbnailURL
      : undefined

  const navUser: NavUserData = {
    name,
    email,
    initials: getInitials(name, email),
    avatarUrl: avatarUrl ?? undefined,
    role: currentUser?.role,
  }

  const createLinks: NavCreatePermissions = {
    article: Boolean(permissions?.collections?.articles?.create),
    media: Boolean(permissions?.collections?.media?.create),
  }

  return (
    <AdminNav
      adminRoute={adminRoute}
      canCreate={createLinks}
      groups={navGroups}
      user={navUser}
      viewType={viewType}
    />
  )
}
