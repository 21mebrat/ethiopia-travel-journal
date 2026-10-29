'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowUp } from 'lucide-react'
import { useEffect } from 'react'

type FooterTopic = {
  slug: string
  name: string
}

type SiteFooterProps = {
  initialLocale: 'en' | 'am'
  topics: FooterTopic[]
  year: number
}

const COPY = {
  en: {
    tagline: 'Stories, culture and destinations from across Ethiopia.',
    explore: 'Explore',
    home: 'Home',
    stories: 'Stories',
    destinations: 'Destinations',
    topics: 'Topics',
    language: 'Language',
    admin: 'Editorial admin',
    top: 'Back to top',
    brandLabel: 'Ethiopia Travel Journal — Home',
    copyright: (year: number) => `© ${year} Ethiopia Travel Journal`,
  },
  am: {
    tagline: 'ከመላው ኢትዮጵያ የተገኙ ታሪኮች፣ ባሕል እና መዳረሻዎች።',
    explore: 'ያስሱ',
    home: 'ዋና ገጽ',
    stories: 'ታሪኮች',
    destinations: 'መዳረሻዎች',
    topics: 'ርዕሶች',
    language: 'ቋንቋ',
    admin: 'የአስተዳዳሪ ክፍል',
    top: 'ወደ ላይ ተመለስ',
    brandLabel: 'የኢትዮጵያ ጉዞ ማስታወሻ — ዋና ገጽ',
    copyright: (year: number) => `© ${year} የኢትዮጵያ ጉዞ ማስታወሻ`,
  },
} as const

function rememberLocale(locale: 'en' | 'am') {
  document.cookie = `etj_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export default function SiteFooter({ initialLocale, topics, year }: SiteFooterProps) {
  const pathname = usePathname() || '/'
  const params = useSearchParams()
  const urlLocale = params.get('locale')
  const locale: 'en' | 'am' = urlLocale === 'am' ? 'am' : urlLocale === 'en' ? 'en' : initialLocale
  const copy = COPY[locale]

  const view = params.get('view')
  const category = params.get('category')
  const query = params.get('q')

  useEffect(() => {
    if (urlLocale === 'am' || urlLocale === 'en') rememberLocale(locale)
  }, [locale, urlLocale])

  const withLocale = (href: string) => {
    const [pathAndQuery, hash] = href.split('#')
    const [path, existingQuery = ''] = pathAndQuery.split('?')
    const next = new URLSearchParams(existingQuery)
    next.set('locale', locale)
    return `${path}?${next.toString()}${hash ? `#${hash}` : ''}`
  }

  const localeHref = (target: 'en' | 'am') => {
    const next = new URLSearchParams(params.toString())
    next.set('locale', target)
    return `${pathname}?${next.toString()}`
  }

  const homeHref = withLocale('/')
  const storiesHref = withLocale('/?view=all#featured-stories')
  const destinationsHref = withLocale('/?view=destinations#featured-stories')

  const homeActive = pathname === '/' && !view && !category && !query
  const storiesActive =
    pathname.startsWith('/articles') ||
    (pathname === '/' && (view === 'all' || Boolean(query)))
  const destinationsActive = pathname === '/' && view === 'destinations'

  return (
    <footer className="site-footer">
      <div className="container-site">
        <div className="site-footer__main">
          <div className="site-footer__brand">
            <Link
              href={homeHref}
              className="site-logo site-logo--footer"
              aria-label={copy.brandLabel}
            >
              <span className="site-logo__name">Ethiopia</span>
              <span className="site-logo__sub">
                {locale === 'am' ? 'የጉዞ ማስታወሻ' : 'Travel Journal'}
              </span>
              <span className="site-logo__line">
                <span aria-hidden="true" />
                {locale === 'am' ? 'የመጀመሪያዎችን ምድር ያግኙ' : 'Discover the land of origins'}
                <span aria-hidden="true" />
              </span>
            </Link>

            <p className="site-footer__tagline">{copy.tagline}</p>
          </div>

          <nav className="site-footer__group" aria-labelledby="site-footer-explore">
            <h2 id="site-footer-explore" className="site-footer__heading">
              {copy.explore}
            </h2>
            <ul className="site-footer__list">
              <li>
                <Link href={homeHref} aria-current={homeActive ? 'page' : undefined}>
                  {copy.home}
                </Link>
              </li>
              <li>
                <Link href={storiesHref} aria-current={storiesActive ? 'page' : undefined}>
                  {copy.stories}
                </Link>
              </li>
              <li>
                <Link
                  href={destinationsHref}
                  aria-current={destinationsActive ? 'page' : undefined}
                >
                  {copy.destinations}
                </Link>
              </li>
            </ul>
          </nav>

          {topics.length > 0 && (
            <nav className="site-footer__group" aria-labelledby="site-footer-topics">
              <h2 id="site-footer-topics" className="site-footer__heading">
                {copy.topics}
              </h2>
              <ul className="site-footer__list">
                {topics.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      href={withLocale(`/?category=${topic.slug}#featured-stories`)}
                      aria-current={category === topic.slug ? 'page' : undefined}
                    >
                      {topic.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav
            className="site-footer__group site-footer__group--language"
            aria-labelledby="site-footer-language"
          >
            <h2 id="site-footer-language" className="site-footer__heading">
              {copy.language}
            </h2>
            <ul className="site-footer__languages">
              <li>
                <Link
                  href={localeHref('en')}
                  hrefLang="en"
                  lang="en"
                  aria-current={locale === 'en' ? 'true' : undefined}
                  onClick={() => rememberLocale('en')}
                >
                  English
                </Link>
              </li>
              <li>
                <Link
                  href={localeHref('am')}
                  hrefLang="am"
                  lang="am"
                  aria-current={locale === 'am' ? 'true' : undefined}
                  onClick={() => rememberLocale('am')}
                >
                  አማርኛ
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p>{copy.copyright(year)}</p>

          <div className="site-footer__meta">
            <Link href="/admin">{copy.admin}</Link>
            <a href="#top">
              {copy.top}
              <ArrowUp aria-hidden="true" size={13} strokeWidth={1.8} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
