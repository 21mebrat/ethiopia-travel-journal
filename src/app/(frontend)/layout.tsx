import type { Metadata } from 'next'
import {
  Inter,
  Noto_Sans_Ethiopic,
  Noto_Serif_Ethiopic,
  Playfair_Display,
  Source_Serif_4,
} from 'next/font/google'
import React, { Suspense } from 'react'

import SiteFooter from '@/components/site/SiteFooter'
import SiteHeader from '@/components/site/SiteHeader'
import { getSiteTopics } from '@/lib/site/home'
import { getSiteLocale } from '@/lib/site/locale'
import './styles.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const notoSansEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic', 'latin'],
  variable: '--font-noto-sans-ethiopic',
  display: 'swap',
})

const notoSerifEthiopic = Noto_Serif_Ethiopic({
  subsets: ['ethiopic', 'latin'],
  variable: '--font-noto-serif-ethiopic',
  display: 'swap',
})

export const metadata: Metadata = {
  description: 'Ethiopia Travel Journal & Tour Blog - Cultural Heritage and Travel Stories.',
  title: 'Ethiopia Travel Journal',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const locale = await getSiteLocale()
  const topics = await getSiteTopics()
  const navTopics = topics.map((topic) => ({ slug: topic.slug, name: topic.name }))
  const year = new Date().getFullYear()

  const dateLabel = new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  const fontClassName = [
    inter.variable,
    sourceSerif.variable,
    playfair.variable,
    notoSansEthiopic.variable,
    notoSerifEthiopic.variable,
  ].join(' ')

  return (
    <html lang={locale} className={fontClassName} suppressHydrationWarning>
      <body id="top">
        <Suspense fallback={<div className="site-header-fallback" aria-hidden="true" />}>
          <SiteHeader
            locale={locale}
            dateLabel={dateLabel}
            topics={navTopics}
          />
        </Suspense>
        <main id="main-content" className="site-main">
          {children}
        </main>
        <Suspense fallback={<div className="site-footer-fallback" aria-hidden="true" />}>
          <SiteFooter initialLocale={locale} topics={navTopics} year={year} />
        </Suspense>
      </body>
    </html>
  )
}
