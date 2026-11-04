'use client'

import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import type { DashboardChartPoint } from '@/lib/dashboard/getDashboardData'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { DashboardCopy } from './copy'

export function PublishingChart({
  className,
  copy,
  data,
}: {
  className?: string
  copy: DashboardCopy
  data: {
    points: DashboardChartPoint[]
    publishedTotal: number
    draftsTotal: number
  }
}) {
  const chartId = useId().replace(/:/g, '')
  const publishedGradient = `published-fill-${chartId}`
  const draftsGradient = `drafts-fill-${chartId}`

  const chartConfig = {
    published: {
      color: 'var(--chart-1)',
      label: copy.published,
    },
    drafts: {
      color: 'var(--chart-2)',
      label: copy.drafts,
    },
  } satisfies ChartConfig

  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>{copy.publishingTitle}</CardTitle>
          <CardDescription>{copy.publishingDescription}</CardDescription>
        </div>
        <CardAction>
          <Badge variant="outline">{copy.last6Months}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col px-3 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[3px] bg-chart-1" />
            {copy.published}
            <span className="font-semibold text-foreground tabular-nums">
              {data.publishedTotal}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[3px] bg-chart-2" />
            {copy.drafts}
            <span className="font-semibold text-foreground tabular-nums">
              {data.draftsTotal}
            </span>
          </span>
        </div>

        <ChartContainer
          className="aspect-auto h-[240px] w-full sm:h-[278px]"
          config={chartConfig}
        >
          <AreaChart
            accessibilityLayer
            data={data.points}
            margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
          >
            <defs>
              <linearGradient id={publishedGradient} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-published)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-published)"
                  stopOpacity={0.02}
                />
              </linearGradient>
              <linearGradient id={draftsGradient} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-drafts)"
                  stopOpacity={0.24}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-drafts)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="month"
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              width={28}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="dot" />}
              cursor={false}
            />
            <Area
              dataKey="published"
              fill={`url(#${publishedGradient})`}
              stroke="var(--color-published)"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="drafts"
              fill={`url(#${draftsGradient})`}
              stroke="var(--color-drafts)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="pt-1 text-xs text-muted-foreground">
        {data.publishedTotal + data.draftsTotal}{' '}
        {data.publishedTotal + data.draftsTotal === 1
          ? copy.contentUpdate
          : copy.contentUpdates}{' '}
        {copy.thisPeriod}
      </CardFooter>
    </Card>
  )
}
