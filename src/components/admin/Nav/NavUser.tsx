'use client'

import {
  BookOpen,
  Globe,
  LogOut,
  Monitor,
  Moon,
  MoreVertical,
  Sun,
  SunMoon,
  UserCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth, useTheme } from '@payloadcms/ui'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { NavCopy } from './copy'
import type { NavUserData } from './types'

type NavUserProps = {
  adminRoute: string
  copy: NavCopy
  user: NavUserData
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(query.matches)

    update()
    query.addEventListener('change', update)

    return () => query.removeEventListener('change', update)
  }, [])

  return isMobile
}

/**
 * dashboard-01 `NavUser`: avatar, name and email in the sidebar footer, with
 * the account menu, theme selector and log out action in a dropdown.
 */
export function NavUser({ adminRoute, copy, user }: NavUserProps) {
  const { logOut } = useAuth()
  const { autoMode, setTheme, theme } = useTheme()
  const isMobile = useIsMobile()

  const activeTheme = autoMode ? 'system' : theme

  const applyTheme = (value: string) => {
    if (value === 'system') {
      // Payload supports an "auto" mode at runtime but its public type only
      // lists light/dark, so the cast is contained here.
      ;(setTheme as unknown as (next: 'auto' | 'dark' | 'light') => void)(
        'auto',
      )
      return
    }

    setTheme(value as 'dark' | 'light')
  }

  return (
    <div className="w-full border-t border-sidebar-border/70 px-1 pt-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex w-full items-center gap-2 rounded-md p-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            type="button"
          >
            <Avatar className="size-8 rounded-lg">
              {user.avatarUrl && (
                <AvatarImage alt={user.name} src={user.avatarUrl} />
              )}
              <AvatarFallback className="rounded-lg bg-sidebar-primary text-[0.6875rem] font-semibold text-sidebar-primary-foreground">
                {user.initials}
              </AvatarFallback>
            </Avatar>

            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-[0.8125rem] font-semibold text-sidebar-foreground">
                {user.name}
              </span>
              <span className="truncate text-[0.6875rem] text-muted-foreground">
                {user.email}
              </span>
            </span>

            <MoreVertical className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side={isMobile ? 'bottom' : 'right'}
          sideOffset={4}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8 rounded-lg">
                {user.avatarUrl && (
                  <AvatarImage alt={user.name} src={user.avatarUrl} />
                )}
                <AvatarFallback className="rounded-lg">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={`${adminRoute}/account`}>
                <UserCircle />
                {copy.account}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SunMoon />
                {copy.theme}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40">
                <DropdownMenuRadioGroup
                  onValueChange={applyTheme}
                  value={activeTheme}
                >
                  <DropdownMenuRadioItem value="light">
                    <Sun />
                    {copy.light}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon />
                    {copy.dark}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor />
                    {copy.system}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <a href="/" rel="noreferrer" target="_blank">
              <Globe />
              {copy.viewSite}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="https://payloadcms.com/docs" rel="noreferrer" target="_blank">
              <BookOpen />
              {copy.documentation}
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              void logOut()
            }}
            variant="destructive"
          >
            <LogOut />
            {copy.logOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
