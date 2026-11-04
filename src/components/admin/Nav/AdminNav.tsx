'use client'

import { useNav, useTranslation } from '@payloadcms/ui'
import { cn } from '@/lib/utils'

import { getNavCopy } from './copy'
import { NavHeader } from './NavHeader'
import { NavMain } from './NavMain'
import { NavUser } from './NavUser'
import type {
  NavCreatePermissions,
  NavGroup,
  NavUserData,
} from './types'

type AdminNavProps = {
  adminRoute: string
  canCreate: NavCreatePermissions
  groups: NavGroup[]
  user: NavUserData
  viewType?: string
}

/**
 * Dashboard-01 sidebar for the Payload admin.
 *
 * The visual structure (header → content → secondary → user footer) matches
 * the shadcn `dashboard-01` block. The outer `<aside>/<div>` shell is kept in
 * sync with Payload's `useNav()` context so the native nav toggler, keyboard
 * shortcut, preference persistence and mobile drawer keep working.
 */
export function AdminNav({
  adminRoute,
  canCreate,
  groups,
  user,
  viewType,
}: AdminNavProps) {
  const { hydrated, navOpen, navRef, shouldAnimate } = useNav()
  const { i18n } = useTranslation()
  const copy = getNavCopy(i18n?.language)

  return (
    <aside
      className={cn(
        'nav',
        navOpen && 'nav--nav-open',
        shouldAnimate && 'nav--nav-animate',
        hydrated && 'nav--nav-hydrated',
      )}
      inert={!navOpen}
    >
      <div className="nav__scroll" ref={navRef}>
        <div className="flex min-h-full w-full flex-col">
          <NavHeader adminRoute={adminRoute} copy={copy} />

          <div className="flex w-full flex-1 flex-col pb-2">
            <NavMain
              adminRoute={adminRoute}
              canCreate={canCreate}
              copy={copy}
              groups={groups}
              viewType={viewType}
            />
          </div>
          <NavUser copy={copy} user={user} adminRoute={adminRoute} />
        </div>
      </div>
    </aside>
  )
}

export default AdminNav
