'use client'

import Link from 'next/link'

import type { NavCopy } from './copy'

type NavHeaderProps = {
  adminRoute: string
  copy: NavCopy
}

/**
 * Mini team-switcher slot from dashboard-01, used here for the publication
 * brand. The logo is the same asset used on the public site.
 */
export function NavHeader({ adminRoute, copy }: NavHeaderProps) {
  return (
    <div className="flex w-full items-center px-1 pb-3">
      <Link
        className="flex min-w-0 items-center gap-2.5 rounded-md p-1.5 pr-2 outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        href={adminRoute}
        prefetch={false}
      >
        <span className="admin-nav__mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Ethiopia Tour Blog" src="/assets/ethiopia-tour-icon.png" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-base font-semibold text-sidebar-foreground">
            Ethiopia Tour Blog
          </span>
          <span className="truncate text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {copy.editorialStudio}
          </span>
        </span>
      </Link>
    </div>
  )
}
