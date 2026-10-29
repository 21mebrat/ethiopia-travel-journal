'use client'

import { Bookmark } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function BookmarkButton({
  itemId,
  itemType = 'story',
  saveLabel = 'Save story',
  removeLabel = 'Remove saved story',
}: {
  itemId: string
  itemType?: 'story' | 'destination'
  saveLabel?: string
  removeLabel?: string
}) {
  const storageKey = `etj:bookmark:${itemType}:${itemId}`
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      setSaved(window.localStorage.getItem(storageKey) === '1')
    } catch {
      // Storage can be blocked by the browser; the button still works for the session.
    }
  }, [storageKey])

  const toggle = () => {
    const next = !saved
    setSaved(next)
    try {
      if (next) window.localStorage.setItem(storageKey, '1')
      else window.localStorage.removeItem(storageKey)
    } catch {
      // Ignore storage failures.
    }
  }

  return (
    <button
      type="button"
      className="story-card__bookmark"
      aria-pressed={saved}
      aria-label={saved ? removeLabel : saveLabel}
      onClick={toggle}
    >
      <Bookmark aria-hidden="true" size={17} strokeWidth={saved ? 2.4 : 1.8} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}
