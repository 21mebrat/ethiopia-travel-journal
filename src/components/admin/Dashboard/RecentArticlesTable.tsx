'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  ExternalLink,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Search,
  Star,
} from 'lucide-react'

import type { DashboardArticle } from '@/lib/dashboard/getDashboardData'
import { cn } from '@/lib/utils'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DashboardCopy } from './copy'

type TabValue = 'all' | 'published' | 'draft'

const getInitials = (name: string | null): string => {
  if (!name) return '—'

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function RecentArticlesTable({
  articles,
  copy,
  locale,
}: {
  articles: DashboardArticle[]
  copy: DashboardCopy
  locale: 'en' | 'am'
}) {
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(
    () => ({
      all: articles.length,
      draft: articles.filter((article) => article.status === 'draft').length,
      published: articles.filter((article) => article.status === 'published').length,
    }),
    [articles],
  )

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return articles.filter((article) => {
      if (activeTab !== 'all' && article.status !== activeTab) return false
      if (!normalizedQuery) return true

      return [
        article.title,
        article.slug,
        article.author ?? '',
        ...article.destinations,
        ...article.categories,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [activeTab, articles, query])

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-5">
        <div className="space-y-1">
          <CardTitle>{copy.recentTitle}</CardTitle>
          <CardDescription>{copy.recentDescription}</CardDescription>
        </div>
        <CardAction>
          <Button asChild size="sm" variant="outline">
            <a href="/admin/collections/articles">
              {copy.viewAll}
              <ArrowUpRight data-icon="inline-end" />
            </a>
          </Button>
        </CardAction>
      </CardHeader>

      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <Tabs
          className="w-full sm:w-auto"
          onValueChange={(value) => setActiveTab(value as TabValue)}
          value={activeTab}
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">
              {copy.all}
              <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {counts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="published">
              {copy.publishedTab}
              <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {counts.published}
              </span>
            </TabsTrigger>
            <TabsTrigger value="draft">
              {copy.draftsTab}
              <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {counts.draft}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={copy.searchArticles}
            className="h-8 pl-8 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchArticles}
            type="search"
            value={query}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/35 hover:bg-muted/35">
              <TableHead className="pl-6">{copy.article}</TableHead>
              <TableHead>{copy.status}</TableHead>
              <TableHead className="hidden lg:table-cell">{copy.destinations}</TableHead>
              <TableHead className="hidden md:table-cell">{copy.author}</TableHead>
              <TableHead>{copy.updated}</TableHead>
              <TableHead className="pr-6 text-right">{copy.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell className="py-14 text-center" colSpan={6}>
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                      <FileText className="size-4 text-muted-foreground" />
                    </span>
                    <p className="text-sm font-medium">{copy.noArticles}</p>
                    <p className="text-xs text-muted-foreground">{copy.noArticlesHint}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((article) => {
                const editHref = `/admin/collections/articles/${article.id}`
                const published = article.status === 'published'

                return (
                  <TableRow className="group" key={article.id}>
                    <TableCell className="max-w-[340px] pl-6">
                      <div className="flex items-center gap-3">
                        {article.thumbnail ? (
                          <img
                            alt=""
                            className="size-10 shrink-0 rounded-md object-cover ring-1 ring-border"
                            src={article.thumbnail}
                          />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border">
                            <FileText className="size-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <a
                              className="truncate text-sm font-medium hover:underline"
                              href={editHref}
                            >
                              {article.title || copy.untitled}
                            </a>
                            {article.featured ? (
                              <Star
                                aria-label={copy.featured}
                                className="size-3.5 shrink-0 fill-amber-400 text-amber-500"
                              />
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            /{article.slug || '—'}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={cn(
                          'gap-1.5',
                          published
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                        )}
                        variant="outline"
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            published ? 'bg-emerald-500' : 'bg-amber-500',
                          )}
                        />
                        {published ? copy.published : copy.draft}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {article.destinations.slice(0, 2).map((destination) => (
                          <Badge className="font-normal" key={destination} variant="secondary">
                            {destination}
                          </Badge>
                        ))}
                        {article.destinations.length > 2 ? (
                          <Badge className="font-normal" variant="outline">
                            +{article.destinations.length - 2}
                          </Badge>
                        ) : null}
                        {article.destinations.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback className="text-[10px] font-semibold">
                            {getInitials(article.author)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[140px] truncate text-sm">
                          {article.author || copy.unknownAuthor}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{article.updatedRelative}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {article.updatedLabel}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={copy.actions}
                            className="text-muted-foreground"
                            size="icon-sm"
                            variant="ghost"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>{copy.actions}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a href={editHref}>
                              <Pencil />
                              {copy.edit}
                            </a>
                          </DropdownMenuItem>
                          {article.slug ? (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/articles/${article.slug}?locale=${locale}&preview=true`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <Eye />
                                {copy.preview}
                              </a>
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem asChild>
                            <a
                              href={`/api/articles/${article.id}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <ExternalLink />
                              {copy.viewApi}
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CardFooter className="justify-between gap-3 border-t py-3 text-xs text-muted-foreground">
        <span>
          {copy.showing} {filtered.length} {copy.of} {articles.length}
        </span>
        <a
          className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          href="/admin/collections/articles"
        >
          {copy.manageAll}
          <ArrowUpRight className="size-3" />
        </a>
      </CardFooter>
    </Card>
  )
}
