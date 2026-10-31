'use client'

import React, { useState } from 'react'
import { Mail, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react'

type NewsletterWidgetProps = {
  title?: string
  subtitle?: string
  locale?: string
  source?: string
  className?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function NewsletterWidget({
  title,
  subtitle,
  locale = 'en',
  source = 'stories_sidebar',
  className = '',
}: NewsletterWidgetProps) {
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already-subscribed' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const isAmharic = locale === 'am'

  const defaultTitle = isAmharic ? 'ጋዜጣችንን ይቀላቀሉ' : 'Join Our Newsletter'
  const defaultSubtitle = isAmharic
    ? 'የቅርብ ጊዜ ታሪኮችን እና የጉዞ መረጃዎችን በኢሜይልዎ ያግኙ።'
    : 'Get the latest stories, travel guides, and exclusive insights from Ethiopia.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setStatus('error')
      setMessage(
        isAmharic ? 'እባክዎ የኢሜይል አድራሻዎን ያስገቡ።' : 'Please enter your email address.',
      )
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setStatus('error')
      setMessage(
        isAmharic
          ? 'እባክዎ ትክክለኛ የኢሜይል ቅርጸት ያስገቡ።'
          : 'Please enter a valid email address.',
      )
      return
    }

    setStatus('loading')
    setMessage(null)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          locale,
          source,
          honeypot,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.alreadySubscribed) {
          setStatus('already-subscribed')
          setMessage(
            data.message ||
              (isAmharic
                ? 'ይህ የኢሜይል አድራሻ አስቀድሞ ተመዝግቧል።'
                : 'You are already subscribed to our newsletter.'),
          )
        } else {
          setStatus('success')
          setMessage(
            data.message ||
              (isAmharic
                ? 'ስለተመዘገቡ እናመሰግናለን! አዳዲስ ታሪኮች ይደርሱዎታል።'
                : 'Thank you for subscribing! You will receive our latest stories.'),
          )
          setEmail('')
        }
      } else {
        setStatus('error')
        setMessage(
          data.error ||
            (isAmharic
              ? 'ይቅርታ፣ ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
              : 'Failed to process subscription. Please try again.'),
        )
      }
    } catch {
      setStatus('error')
      setMessage(
        isAmharic
          ? 'የኔትወርክ ችግር አጋጥሟል። እባክዎ ግንኙነትዎን ያረጋግጡና እንደገና ይሞክሩ።'
          : 'Network error. Please check your connection and try again.',
      )
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setMessage(null)
  }

  return (
    <aside
      className={`rounded-xs border border-border bg-card text-card-foreground p-6 sm:p-7 shadow-xs ${className}`}
      aria-label={title || defaultTitle}
    >
      <div>
        <h4 className="font-sans text-xs uppercase tracking-[0.16em] font-bold text-foreground mb-2 flex items-center gap-2">
          <Mail size={14} className="text-foreground/80" />
          <span>{title || defaultTitle}</span>
        </h4>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
          {subtitle || defaultSubtitle}
        </p>

        {/* Success State */}
        {status === 'success' && (
          <div
            className="mb-4 p-3 rounded-xs bg-primary/10 border border-primary/20 text-foreground text-xs animate-in fade-in duration-200"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{message}</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-2 text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  {isAmharic ? 'ሌላ ኢሜይል ያስመዝግቡ' : 'Subscribe another email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already Subscribed State */}
        {status === 'already-subscribed' && (
          <div
            className="mb-4 p-3 rounded-xs bg-muted border border-border text-foreground text-xs animate-in fade-in duration-200"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2.5">
              <Info size={16} className="text-foreground/70 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{message}</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-2 text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  {isAmharic ? 'ሌላ ኢሜይል ይሞክሩ' : 'Try a different email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div
            className="mb-4 p-3 rounded-xs bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-in fade-in duration-200"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="font-medium">{message}</p>
            </div>
          </div>
        )}

        {/* Subscription Form (only shown if not currently in pure success state) */}
        {status !== 'success' && (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            {/* Bot prevention honeypot */}
            <input
              type="text"
              name="hp_website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <div className="relative flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status === 'error') {
                    setStatus('idle')
                    setMessage(null)
                  }
                }}
                placeholder={isAmharic ? 'የኢሜይል አድራሻዎን ያስገቡ' : 'Your email address'}
                disabled={status === 'loading'}
                required
                aria-label={isAmharic ? 'የኢሜይል አድራሻ' : 'Email address'}
                className="w-full px-3.5 py-2.5 rounded-xs text-xs bg-background text-foreground border border-input placeholder:text-muted-foreground/60 transition-colors focus:outline-hidden focus:ring-1 focus:ring-ring focus:border-ring disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xs bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:bg-primary/90 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-xs"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{isAmharic ? 'በመመዝገብ...' : 'Subscribing...'}</span>
                </>
              ) : (
                <span>{isAmharic ? 'ተመዝገብ' : 'Subscribe'}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </aside>
  )
}
