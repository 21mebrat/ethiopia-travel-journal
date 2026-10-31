'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Home,
  LayoutGrid,
  MapPin,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

type Topic = {
  slug: string
  name: string
}

type SiteHeaderProps = {
  locale: 'en' | 'am'
  dateLabel: string
  topics: Topic[]
}

const COPY = {
  en: {
    home: 'Home',
    stories: 'Stories',
    destinations: 'Destinations',
    culture: 'Culture & Heritage',
    topics: 'Topics',
    more: 'More',
    search: 'Search',
    searchStories: 'Search stories, destinations…',
    searchLabel: 'Search stories and destinations',
    close: 'Close',
    menu: 'Open site menu',
    openSearch: 'Open search',
    language: 'Language',
    admin: 'Admin panel',
    skip: 'Skip to content',
    tagline: ['Travel', 'Culture', 'People', 'Places'],
    brandSub: 'Travel Journal',
    brandLine: 'Discover the land of origins',
    browse: 'Browse',
    explore: 'Explore',
  },
  am: {
    home: 'ዋና ገጽ',
    stories: 'ታሪኮች',
    destinations: 'መዳረሻዎች',
    culture: 'ባሕል እና ቅርስ',
    topics: 'ርዕሶች',
    more: 'ተጨማሪ',
    search: 'ፍለጋ',
    searchStories: 'ታሪኮችን፣ መዳረሻዎችን ይፈልጉ…',
    searchLabel: 'ታሪኮችን እና መዳረሻዎችን ይፈልጉ',
    close: 'ዝጋ',
    menu: 'የጣቢያ ምናሌ ክፈት',
    openSearch: 'ፍለጋ ክፈት',
    language: 'ቋንቋ',
    admin: 'የአስተዳዳሪ ክፍል',
    skip: 'ወደ ዋና ይዘት ዝለል',
    tagline: ['ጉዞ', 'ባሕል', 'ሰዎች', 'ቦታዎች'],
    brandSub: 'የጉዞ ማስታወሻ',
    brandLine: 'የመጀመሪያዎችን ምድር ያግኙ',
    browse: 'ያስሱ',
    explore: 'ያስሱ',
  },
} as const

function rememberLocale(locale: 'en' | 'am') {
  document.cookie = `etj_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export default function SiteHeader({ locale: initialLocale, dateLabel, topics }: SiteHeaderProps) {
  const pathname = usePathname() || '/'
  const params = useSearchParams()
  const router = useRouter()

  const urlLocale = params.get('locale')
  const locale: 'en' | 'am' = urlLocale === 'am' ? 'am' : urlLocale === 'en' ? 'en' : initialLocale
  const copy = COPY[locale]

  const view = params.get('view')
  const category = params.get('category')
  const query = params.get('q') ?? ''

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(query)

  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)

  const closeDialogs = useCallback(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [])

  useEffect(() => {
    setSearchValue(query)
  }, [query])

  // Keep the document language and the locale cookie aligned with a deep link
  // such as ?locale=am, including client-side navigations.
  useEffect(() => {
    document.documentElement.lang = locale
    if (urlLocale === 'am' || urlLocale === 'en') rememberLocale(locale)
  }, [locale, urlLocale])

  useEffect(() => {
    closeDialogs()
  }, [pathname, closeDialogs])

  useEffect(() => {
    const dialog = menuOpen ? menuRef.current : searchOpen ? searchRef.current : null
    if (!dialog) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const bodyOverflow = document.body.style.overflow
    const bodyPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null)

    const focusTimer = window.setTimeout(() => {
      if (searchOpen) searchInputRef.current?.focus()
      else getFocusable()[0]?.focus()
    }, 30)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialogs()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = bodyOverflow
      document.body.style.paddingRight = bodyPaddingRight
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [menuOpen, searchOpen, closeDialogs])

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
  const storiesHref = withLocale('/stories')
  const destinationsHref = withLocale('/destinations')
  const cultureTopic = topics.find((topic) => topic.slug.includes('culture')) ?? topics[0]
  const cultureHref = cultureTopic
    ? withLocale(`/?category=${cultureTopic.slug}#featured-stories`)
    : storiesHref

  const homeActive = pathname === '/' && !view && !category && !query
  const storiesActive =
    pathname.startsWith('/stories') ||
    pathname.startsWith('/articles') ||
    (pathname === '/' && (view === 'all' || Boolean(query)))
  const destinationsActive =
    pathname.startsWith('/destinations') || (pathname === '/' && view === 'destinations')
  const cultureActive = pathname === '/' && Boolean(category) && !view

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = new URLSearchParams()
    next.set('locale', locale)
    if (searchValue.trim()) next.set('q', searchValue.trim())
    router.push(`/?${next.toString()}#featured-stories`)
    closeDialogs()
  }

  const openSearch = () => {
    setMenuOpen(false)
    setSearchOpen(true)
  }

  const languageSwitch = (
    <div className="site-language" role="group" aria-label={copy.language}>
      <Link
        href={localeHref('en')}
        className="site-language__link"
        aria-current={locale === 'en' ? 'true' : undefined}
        onClick={() => rememberLocale('en')}
      >
        EN
      </Link>
      <span aria-hidden="true">/</span>
      <Link
        href={localeHref('am')}
        className="site-language__link site-language__link--am"
        aria-current={locale === 'am' ? 'true' : undefined}
        onClick={() => rememberLocale('am')}
      >
        አማ
      </Link>
    </div>
  )

  return (
    <header className={`site-header ${homeActive ? 'site-header--overlay' : ''}`}>
      <a className="skip-link" href="#main-content">
        {copy.skip}
      </a>

      {/* Desktop utility strip */}
      <div className="site-utility">
        <div className="container-site site-utility__inner">
          <p className="site-utility__date">{dateLabel}</p>
          <div className="site-utility__right">{languageSwitch}</div>
        </div>
      </div>

      {/* Desktop masthead */}
      <div className="container-site site-masthead">
        <p className="site-masthead__tagline" aria-hidden="true">
          {copy.tagline.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>

        <Link href={homeHref} className="site-logo" aria-label={`${copy.brandSub} — ${copy.home}`}>
          <span className="site-logo__name">Ethiopia</span>
          <span className="site-logo__sub">{copy.brandSub}</span>
          <span className="site-logo__line">
            <span aria-hidden="true" />
            {copy.brandLine}
            <span aria-hidden="true" />
          </span>
        </Link>

        <form className="site-search" action="/" method="get" role="search">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="site-search__submit" aria-label={copy.search}>
            <Search aria-hidden="true" size={20} strokeWidth={1.6} />
          </button>
          <label className="sr-only" htmlFor="site-search-desktop">
            {copy.searchLabel}
          </label>
          <input
            id="site-search-desktop"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={copy.searchStories}
            className="site-search__input"
            autoComplete="off"
          />
        </form>
      </div>

      {/* Desktop primary navigation */}
      <nav className="site-nav" aria-label={locale === 'am' ? 'ዋና ምናሌ' : 'Primary'}>
        <div className="container-site site-nav__inner">
          <Link
            href={homeHref}
            className="site-nav__link"
            aria-current={homeActive ? 'page' : undefined}
          >
            {copy.home}
          </Link>
          <Link
            href={storiesHref}
            className="site-nav__link"
            aria-current={storiesActive ? 'page' : undefined}
          >
            {copy.stories}
          </Link>
          <Link
            href={destinationsHref}
            className="site-nav__link"
            aria-current={destinationsActive ? 'page' : undefined}
          >
            {copy.destinations}
          </Link>
          <Link
            href={cultureHref}
            className="site-nav__link"
            aria-current={cultureActive ? 'page' : undefined}
          >
            {copy.culture}
          </Link>

          {topics.length > 0 && (
            <details className="site-topics">
              <summary className="site-nav__link site-topics__summary">
                {copy.topics}
                <ChevronDown aria-hidden="true" size={15} strokeWidth={1.6} />
              </summary>
              <ul className="site-topics__panel">
                {topics.map((topic) => (
                  <li key={topic.slug}>
                    <Link href={withLocale(`/?category=${topic.slug}#featured-stories`)}>
                      {topic.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </nav>

      {/* Mobile masthead */}
      <div className="site-mobile-bar container-site">
        <Link href={homeHref} className="site-logo site-logo--mobile" aria-label={copy.home}>
          <span className="site-logo__name">Ethiopia</span>
          <span className="site-logo__sub">{copy.brandSub}</span>
          <span className="site-logo__line">
            <span aria-hidden="true" />
            {copy.brandLine}
            <span aria-hidden="true" />
          </span>
        </Link>

        <div className="site-mobile-bar__actions">
          {languageSwitch}
          <button
            ref={searchButtonRef}
            type="button"
            className="site-icon-button site-icon-button--search"
            aria-label={copy.openSearch}
            aria-expanded={searchOpen}
            aria-controls="site-search-dialog"
            onClick={openSearch}
          >
            <Search aria-hidden="true" size={22} strokeWidth={1.7} />
          </button>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="site-tabs" aria-label={locale === 'am' ? 'የሞባይል ምናሌ' : 'Mobile primary'}>
        <Link
          href={homeHref}
          className={`site-tab ${homeActive ? 'is-active' : ''}`}
          aria-current={homeActive ? 'page' : undefined}
        >
          <Home aria-hidden="true" size={23} strokeWidth={homeActive ? 2.2 : 1.7} />
          <span>{copy.home}</span>
          <span className="site-tab__dot" aria-hidden="true" />
        </Link>
        <Link
          href={storiesHref}
          className={`site-tab ${storiesActive ? 'is-active' : ''}`}
          aria-current={storiesActive ? 'page' : undefined}
        >
          <BookOpen aria-hidden="true" size={23} strokeWidth={storiesActive ? 2.2 : 1.7} />
          <span>{copy.stories}</span>
          <span className="site-tab__dot" aria-hidden="true" />
        </Link>
        <Link
          href={destinationsHref}
          className={`site-tab ${destinationsActive ? 'is-active' : ''}`}
          aria-current={destinationsActive ? 'page' : undefined}
        >
          <MapPin aria-hidden="true" size={23} strokeWidth={destinationsActive ? 2.2 : 1.7} />
          <span>{copy.destinations}</span>
          <span className="site-tab__dot" aria-hidden="true" />
        </Link>
        <Link
          href={cultureHref}
          className={`site-tab ${cultureActive ? 'is-active' : ''}`}
          aria-current={cultureActive ? 'page' : undefined}
        >
          <LayoutGrid aria-hidden="true" size={23} strokeWidth={cultureActive ? 2.2 : 1.7} />
          <span>{copy.culture === 'Culture & Heritage' ? 'Culture' : copy.culture}</span>
          <span className="site-tab__dot" aria-hidden="true" />
        </Link>
        <button
          type="button"
          className={`site-tab site-tab--button ${menuOpen ? 'is-active' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="site-more-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal aria-hidden="true" size={24} strokeWidth={1.8} />
          <span>{copy.more}</span>
          <span className="site-tab__dot" aria-hidden="true" />
        </button>
      </nav>

      {/* Mobile search dialog */}
      {searchOpen && (
        <div
          className="site-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-search-title"
          id="site-search-dialog"
        >
          <div className="site-dialog__panel site-dialog__panel--search" ref={searchRef}>
            <div className="site-dialog__header">
              <h2 id="site-search-title" className="site-dialog__title">
                {copy.search}
              </h2>
              <button
                type="button"
                className="site-icon-button"
                aria-label={copy.close}
                onClick={closeDialogs}
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>

            <form className="site-dialog__search" role="search" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="site-search-mobile">
                {copy.searchLabel}
              </label>
              <input
                id="site-search-mobile"
                ref={searchInputRef}
                type="search"
                name="q"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={copy.searchStories}
                autoComplete="off"
                className="site-search__input"
              />
              <button type="submit" className="site-button">
                {copy.search}
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            </form>
          </div>
          <button
            type="button"
            className="site-dialog__backdrop"
            aria-label={copy.close}
            tabIndex={-1}
            onClick={closeDialogs}
          />
        </div>
      )}

      {/* Mobile "More" sheet */}
      {menuOpen && (
        <div
          className="site-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-more-title"
          id="site-more-menu"
        >
          <div className="site-sheet" ref={menuRef}>
            <div className="site-sheet__handle" aria-hidden="true" />
            <div className="site-dialog__header">
              <h2 id="site-more-title" className="site-dialog__title">
                {copy.more}
              </h2>
              <button
                type="button"
                className="site-icon-button"
                aria-label={copy.close}
                onClick={closeDialogs}
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>

            <p className="kicker site-sheet__label">{copy.browse}</p>
            <ul className="site-sheet__links">
              <li>
                <Link href={homeHref} aria-current={homeActive ? 'page' : undefined}>
                  <Home aria-hidden="true" size={18} />
                  {copy.home}
                </Link>
              </li>
              <li>
                <Link href={storiesHref} aria-current={storiesActive ? 'page' : undefined}>
                  <BookOpen aria-hidden="true" size={18} />
                  {copy.stories}
                </Link>
              </li>
              <li>
                <Link
                  href={destinationsHref}
                  aria-current={destinationsActive ? 'page' : undefined}
                >
                  <MapPin aria-hidden="true" size={18} />
                  {copy.destinations}
                </Link>
              </li>
            </ul>

            {topics.length > 0 && (
              <>
                <p className="kicker site-sheet__label">{copy.explore}</p>
                <ul className="site-sheet__topics">
                  {topics.map((topic) => (
                    <li key={topic.slug}>
                      <Link href={withLocale(`/?category=${topic.slug}#featured-stories`)}>
                        {topic.name}
                        <ArrowRight aria-hidden="true" size={15} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="site-sheet__footer">
              {languageSwitch}
              <Link href="/admin" className="site-sheet__admin">
                {copy.admin}
              </Link>
            </div>
          </div>

          <button
            type="button"
            className="site-dialog__backdrop"
            aria-label={copy.close}
            tabIndex={-1}
            onClick={closeDialogs}
          />
        </div>
      )}
    </header>
  )
}
