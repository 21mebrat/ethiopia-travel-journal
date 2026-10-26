'use client'

import { BookOpen, ExternalLink, Globe } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { NavCopy } from './copy'

type NavSecondaryProps = {
  className?: string
  copy: NavCopy
}

/**
 * Mirrors dashboard-01's `NavSecondary` group pinned to the bottom of the
 * sidebar content: utility links that are not part of the editorial workspace.
 */
export function NavSecondary({ className, copy }: NavSecondaryProps) {
  return (
    <div
      className={cn(
        'w-full border-t border-sidebar-border/70 px-1 pt-2',
        className,
      )}
    >
      <ul className="flex flex-col gap-0.5">
        <li>
          <a
            className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-[0.8125rem] font-medium text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            href="/"
            rel="noreferrer"
            target="_blank"
          >
            <Globe className="size-4 shrink-0 opacity-70" />
            <span className="truncate">{copy.viewSite}</span>
            <ExternalLink className="ml-auto size-3 opacity-40" />
          </a>
        </li>
        <li>
          <a
            className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-[0.8125rem] font-medium text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            href="https://payloadcms.com/docs"
            rel="noreferrer"
            target="_blank"
          >
            <BookOpen className="size-4 shrink-0 opacity-70" />
            <span className="truncate">{copy.documentation}</span>
            <ExternalLink className="ml-auto size-3 opacity-40" />
          </a>
        </li>
      </ul>
    </div>
  )
}
