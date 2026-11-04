'use client'

import { CirclePlus, ImagePlus, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { NavCopy } from './copy'
import { getNavIcon } from './icons'
import type { NavCreatePermissions, NavGroup } from './types'

type NavMainProps = {
  adminRoute: string
  canCreate: NavCreatePermissions
  copy: NavCopy
  groups: NavGroup[]
  viewType?: string
}

type MenuItem = {
  active: boolean
  href: string
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function NavMain({
  adminRoute,
  canCreate,
  copy,
  groups,
  viewType,
}: NavMainProps) {
  const pathname = usePathname()

  const items: MenuItem[] = [
    {
      active: viewType === 'dashboard' || pathname === adminRoute,
      href: adminRoute,
      icon: LayoutDashboard,
      key: 'dashboard',
      label: copy.dashboard,
    },
    // Flatten Payload's groups into the single flat nav of dashboard-01 while
    // keeping the ordering defined in each collection's `admin.group`.
    ...groups.flatMap((group) =>
      group.entities.map((entity) => ({
        active:
          pathname === entity.href || pathname.startsWith(`${entity.href}/`),
        href: entity.href,
        icon: getNavIcon(entity.slug),
        key: `${entity.type}-${entity.slug}`,
        label: entity.label,
      })),
    ),
  ]

  const showQuickCreate = canCreate.article || canCreate.media

  return (
    <nav aria-label={copy.navigation} className="flex w-full flex-col gap-3">
      {showQuickCreate && (
        <div className="flex items-center gap-2 px-1">
          {canCreate.article && (
            <Button
              asChild
              className="h-8 min-w-8 flex-1 justify-start gap-1.5 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground [&_svg]:size-4"
              size="sm"
            >
              <Link
                href={`${adminRoute}/collections/articles/create`}
                prefetch={false}
              >
                <CirclePlus />
                <span className="truncate">{copy.newArticle}</span>
              </Link>
            </Button>
          )}
          {canCreate.media && (
            <Button
              asChild
              className="size-8 shrink-0"
              size="icon-sm"
              title={copy.uploadMedia}
              variant="outline"
            >
              <Link
                aria-label={copy.uploadMedia}
                href={`${adminRoute}/collections/media/create`}
                prefetch={false}
              >
                <ImagePlus />
              </Link>
            </Button>
          )}
        </div>
      )}

      <ul className="flex w-full flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <li key={item.key}>
              <Link
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'group flex h-8 w-full items-center gap-2 rounded-md px-2  py-6 no-underline  text-lg font-medium text-sidebar-foreground/90 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  item.active &&
                  'bg-sidebar-accent border-l-4 border-l-amber-700 font-semibold text-sidebar-accent-foreground',
                )}
                href={item.href}
                prefetch={false}
              >
                <Icon
                  className={cn(
                    'size-4 shrink-0 text-sidebar-foreground/60 transition-colors group-hover:text-sidebar-accent-foreground',
                    item.active && 'text-sidebar-primary',
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
