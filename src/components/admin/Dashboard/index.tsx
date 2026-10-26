import type { AdminViewServerProps } from 'payload'
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Globe,
  LayoutDashboard,
  Plus,
  Search,
} from 'lucide-react'

import type { User } from '@/payload-types'
import { getDashboardData } from '@/lib/dashboard/getDashboardData'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDashboardCopy } from './copy'
import { PublishingChart } from './PublishingChart'
import { RecentArticlesTable } from './RecentArticlesTable'
import { RegionBreakdown } from './RegionBreakdown'
import { StatCards } from './StatCards'

export default async function Dashboard(props: AdminViewServerProps) {
  const { i18n, initPageResult, payload, user } = props

  const locale = i18n.language === 'am' ? 'am' : 'en'
  const copy = getDashboardCopy(locale)

  const currentUser = user as User | undefined
  const currentUserName =
    currentUser?.displayName?.trim() ||
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim()

  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12
      ? copy.goodMorning
      : currentHour < 18
        ? copy.goodAfternoon
        : copy.goodEvening

  const formattedDate = new Intl.DateTimeFormat(locale === 'am' ? 'am' : 'en', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date())

  const data = await getDashboardData({
    locale,
    payload,
    user: (initPageResult.req.user ?? user) as User | null,
  })

  return (
    <div className="admin-dashboard text-foreground">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 md:gap-6 md:p-6 lg:p-8">
        {/* ------------------------------------------------------------------ */}
        {/* Page header                                                         */}
        {/* ------------------------------------------------------------------ */}
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LayoutDashboard className="size-3.5" />
              <span>{copy.breadcrumbDashboard}</span>
              <ChevronRight className="size-3 opacity-60" />
              <span className="font-medium text-foreground">
                {copy.breadcrumbOverview}
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                {currentUserName
                  ? `${greeting}, ${currentUserName}`
                  : copy.welcomeBack}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{copy.welcomeSubtitle}</span>
                <span className="hidden size-1 rounded-full bg-border sm:inline-block" />
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form
              action="/admin/collections/articles"
              className="relative w-full sm:w-52"
            >
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={copy.searchArticles}
                className="h-9 bg-card pl-8"
                name="search"
                placeholder={copy.searchPlaceholder}
                type="search"
              />
            </form>

            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <a href="/" rel="noreferrer" target="_blank">
                  <Globe data-icon="inline-start" />
                  {copy.viewSite}
                </a>
              </Button>
              <Button asChild size="sm">
                <a href="/admin/collections/articles/create">
                  <Plus data-icon="inline-start" />
                  {copy.newArticle}
                </a>
              </Button>
            </div>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* KPI cards                                                           */}
        {/* ------------------------------------------------------------------ */}
        <StatCards copy={copy} stats={data.stats} />

        {/* ------------------------------------------------------------------ */}
        {/* Publishing chart + region breakdown                                 */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <PublishingChart
            className="xl:col-span-2"
            copy={copy}
            data={data.chart}
          />
          <RegionBreakdown
            copy={copy}
            locale={locale}
            regions={data.regions}
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Recent editorial activity                                           */}
        {/* ------------------------------------------------------------------ */}
        <RecentArticlesTable
          articles={data.recentArticles}
          copy={copy}
          locale={locale}
        />

        <footer className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CircleCheck className="size-3.5" />
            Ethiopia Tour Blog · Editorial workspace
          </span>
        </footer>
      </div>
    </div>
  )
}
