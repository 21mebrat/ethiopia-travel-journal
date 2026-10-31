'use client'

import React from 'react'
import {
  MapPin,
  Mountain,
  Calendar,
  Compass,
  Heart,
  Clock,
  Sparkles,
} from 'lucide-react'
import type { DestinationItem } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type QuickInfoCardProps = {
  destination: DestinationItem
  locale?: SiteLocale
}

export default function QuickInfoCard({ destination, locale = 'en' }: QuickInfoCardProps) {
  const isAm = locale === 'am'

  if (!destination.quickInfo) return null

  const candidateItems = [
    {
      icon: MapPin,
      label: isAm ? 'ክልል' : 'Region',
      value: destination.quickInfo.region,
    },
    {
      icon: Mountain,
      label: isAm ? 'ከፍታ' : 'Elevation',
      value: destination.quickInfo.elevation,
    },
    {
      icon: Calendar,
      label: isAm ? 'ምርጥ የጉብኝት ወቅት' : 'Best Time',
      value: destination.quickInfo.bestTime,
    },
    {
      icon: Compass,
      label: isAm ? 'ዋና ዋና መስህቦች' : 'Main Attractions',
      value: destination.quickInfo.mainAttractions,
    },
    {
      icon: Heart,
      label: isAm ? 'ተስማሚ ለ' : 'Ideal For',
      value: destination.quickInfo.idealFor,
    },
    {
      icon: Clock,
      label: isAm ? 'የቆይታ ጊዜ' : 'Visit Duration',
      value: destination.quickInfo.visitDuration,
    },
  ]

  const items = candidateItems.filter((item) => Boolean(item.value))

  if (items.length === 0) return null

  return (
    <section
      aria-label={isAm ? 'ፈጣን መረጃ' : 'Quick Information'}
      className="my-10 rounded-2xl border border-border/80 bg-card p-6 md:p-8 text-card-foreground shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border/60 pb-4">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h3 className="font-serif text-xl font-bold tracking-tight text-foreground">
          {isAm ? 'ፈጣን መረጃ' : 'Quick Information'}
        </h3>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <div key={index} className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-sm font-bold text-foreground">
                  {item.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
