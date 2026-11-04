'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default function NewsletterUnsubscribePage(props: {
  searchParams: SearchParams
}) {
  const searchParams = use(props.searchParams)
  const token = typeof searchParams.token === 'string' ? searchParams.token.trim() : ''
  const locale = typeof searchParams.locale === 'string' && searchParams.locale === 'am' ? 'am' : 'en'

  const isAmharic = locale === 'am'

  const [status, setStatus] = useState<'prompt' | 'loading' | 'success' | 'error'>('prompt')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConfirmUnsubscribe = async () => {
    if (!token) {
      setStatus('error')
      setErrorMessage(
        isAmharic
          ? 'የማስመሰያ ቁልፍ አልተገኘም። እባክዎ በኢሜይልዎ ያለውን አገናኝ ይጫኑ።'
          : 'Unsubscribe token is missing. Please use the link provided in your email.',
      )
      return
    }

    setStatus('loading')
    setErrorMessage(null)

    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(
          data.error ||
            (isAmharic
              ? 'ከዝርዝር ማስወጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
              : 'Failed to process unsubscribe request. Please try again.'),
        )
      }
    } catch {
      setStatus('error')
      setErrorMessage(
        isAmharic
          ? 'የኔትወርክ ስህተት አጋጥሟል። እባክዎ ግንኙነትዎን ይፈትሹ።'
          : 'A network error occurred. Please check your connection and try again.',
      )
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-background">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl p-8 sm:p-10 shadow-sm text-center">
        {status === 'success' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-card-foreground mb-4">
              {isAmharic ? 'በተሳካ ሁኔታ ተሰርዘዋል' : 'You Have Been Unsubscribed'}
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
              {isAmharic
                ? 'ከኢትዮጵያ ጉዞ ማስታወሻ የዜና መጽሔት ዝርዝር ውስጥ በተሳካ ሁኔታ ወጥተዋል። ከዚህ በኋላ መልእክቶች በኢሜይልዎ አይላኩም።'
                : 'You have been removed from the Ethiopia Travel Journal newsletter list. You will no longer receive story notifications from us.'}
            </p>

            <div className="flex justify-center">
              <Link
                href={isAmharic ? "/stories?locale=am" : "/stories"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                {isAmharic ? 'ወደ ታሪኮች ተመለስ' : 'Return to Stories'}
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-9 h-9 text-primary" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              {isAmharic ? 'የኢትዮጵያ ጉዞ ማስታወሻ' : 'ETHIOPIA TRAVEL JOURNAL'}
            </span>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-card-foreground mb-4">
              {isAmharic ? 'ከዜና መጽሔቱ መውጣት ይፈልጋሉ?' : 'Confirm Unsubscribe'}
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
              {isAmharic
                ? 'እርግጠኛ ነዎት ከኢትዮጵያ ጉዞ ማስታወሻ አዳዲስ ታሪኮች እና የጉዞ መረጃዎች ዝርዝር መውጣት ይፈልጋሉ?'
                : 'Are you sure you want to unsubscribe from the Ethiopia Travel Journal newsletter? You will miss out on upcoming cultural essays, heritage explorations, and travel guides.'}
            </p>

            {status === 'error' && errorMessage && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm leading-relaxed">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleConfirmUnsubscribe}
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-destructive text-white hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isAmharic ? 'በማስኬድ ላይ...' : 'Unsubscribing...'}
                  </>
                ) : isAmharic ? (
                  'አዎ፣ ከዝርዝሩ አስወግደኝ'
                ) : (
                  'Yes, Unsubscribe Me'
                )}
              </button>
              <Link
                href={isAmharic ? "/stories?locale=am" : "/stories"}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors text-sm"
              >
                {isAmharic ? 'ተመለስ' : 'Keep Subscription'}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
