'use client'

import { useEffect, useRef } from 'react'

type ArticleViewTrackerProps = {
  articleId: string
  slug: string
  preview?: boolean
}

export default function ArticleViewTracker({
  articleId,
  slug,
  preview = false,
}: ArticleViewTrackerProps) {
  const hasFiredRef = useRef(false)

  useEffect(() => {
    // 1. Never track views during preview or draft review
    if (preview) return
    // 2. Prevent React 18/19 StrictMode double execution
    if (hasFiredRef.current) return

    // 3. Skip automated bots / headless automation unless executing an explicit test
    if (typeof navigator !== 'undefined' && (navigator as any).webdriver && !window.location.search.includes('testViewTracking=true')) {
      return
    }

    const trackView = async () => {
      if (hasFiredRef.current) return
      hasFiredRef.current = true

      try {
        await fetch('/api/stories/track-view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            articleId,
            slug,
            preview: false,
          }),
        })
      } catch (err) {
        // Non-blocking; tracking failures must never degrade reader experience
        console.debug('ArticleViewTracker notice:', err)
      }
    }

    // 4. Track only when the document is active and visible
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure client hydration is complete
        const timer = setTimeout(trackView, 1200)
        return () => clearTimeout(timer)
      } else {
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            trackView()
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [articleId, slug, preview])

  return null
}
