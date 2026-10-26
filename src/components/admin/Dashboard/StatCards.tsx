import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Images,
  MapPin,
  Users,
} from 'lucide-react'

import type { DashboardStat, DashboardStatId } from '@/lib/dashboard/getDashboardData'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardCopy } from './copy'

const STAT_ICONS: Record<DashboardStatId, typeof FileText> = {
  articles: FileText,
  destinations: MapPin,
  media: Images,
  team: Users,
}

export function StatCards({
  copy,
  stats,
}: {
  copy: DashboardCopy
  stats: DashboardStat[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = STAT_ICONS[stat.id]
        const isPositive = stat.delta !== null && stat.delta > 0
        const isNegative = stat.delta !== null && stat.delta < 0
        const hasChange = isPositive || isNegative

        const deltaLabel =
          stat.delta === null
            ? `+${stat.deltaValue} ${copy.new}`
            : stat.delta === 0
              ? copy.noChange
              : `${stat.delta > 0 ? '+' : ''}${stat.delta}%`

        return (
          <a
            className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={stat.href}
            key={stat.id}
          >
            <Card className="@container/card h-full bg-gradient-to-t from-primary/5 to-card shadow-xs transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-md dark:bg-card">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Icon className="size-3.5 opacity-60" />
                  {stat.label}
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stat.value.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <Badge
                    className={
                      isPositive
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : isNegative
                          ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          : undefined
                    }
                    variant="outline"
                  >
                    {hasChange && isPositive ? (
                      <ArrowUpRight data-icon="inline-start" />
                    ) : null}
                    {hasChange && isNegative ? (
                      <ArrowDownRight data-icon="inline-start" />
                    ) : null}
                    {deltaLabel}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex w-full gap-2 font-medium">
                  {stat.insight}
                </div>
                <div className="line-clamp-2 text-muted-foreground">{stat.note}</div>
              </CardFooter>
            </Card>
          </a>
        )
      })}
    </div>
  )
}
