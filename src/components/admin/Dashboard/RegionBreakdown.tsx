import { MapPin, Plus } from 'lucide-react'

import type { DashboardRegion } from '@/lib/dashboard/getDashboardData'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardCopy } from './copy'

export function RegionBreakdown({
  copy,
  locale,
  regions,
}: {
  copy: DashboardCopy
  locale: 'en' | 'am'
  regions: {
    items: DashboardRegion[]
    covered: number
    total: number
  }
}) {
  const maxCount = Math.max(...regions.items.map((region) => region.count), 1)

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>{copy.regionTitle}</CardTitle>
          <CardDescription>{copy.regionDescription}</CardDescription>
        </div>
        <CardAction className="shrink-0">
          <Badge variant="outline">
            {regions.covered}/{regions.total}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center">
        {regions.items.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
            <MapPin className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{copy.noRegionData}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {regions.items.map((region, index) => {
              const params = new URLSearchParams({
                'where[region][equals]': region.value,
              })

              return (
                <a
                  className="group block space-y-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/admin/collections/destinations?${params.toString()}`}
                  key={region.value}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium transition-colors group-hover:text-primary">
                      {region.label[locale]}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                      {region.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-1 transition-[width] duration-500 ease-out"
                      style={{
                        opacity: Math.max(0.4, 1 - index * 0.12),
                        width: `${Math.max((region.count / maxCount) * 100, 4)}%`,
                      }}
                    />
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-3 pt-1">
        <span className="text-xs text-muted-foreground">
          {regions.covered}{' '}
          {regions.covered === 1 ? copy.regionCovered : copy.regionsCovered}
        </span>
        <Button asChild size="sm" variant="ghost">
          <a href="/admin/collections/destinations/create">
            <Plus data-icon="inline-start" />
            {copy.addDestination}
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
