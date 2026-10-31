import React from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Mail, ArrowRight } from 'lucide-react'
import { getPayload, type Where } from 'payload'
import configPromise from '@/payload.config'
import { isTokenExpired, verifyTokenHash } from '@/lib/email/tokens'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export const dynamic = 'force-dynamic'

export default async function NewsletterConfirmPage(props: {
  searchParams: SearchParams
}) {
  const searchParams = await props.searchParams
  const token = typeof searchParams.token === 'string' ? searchParams.token.trim() : ''
  const emailParam = typeof searchParams.email === 'string' ? searchParams.email.trim().toLowerCase() : ''
  const locale = typeof searchParams.locale === 'string' && searchParams.locale === 'am' ? 'am' : 'en'

  const isAmharic = locale === 'am'

  let status: 'success' | 'expired' | 'invalid' | 'missing' = 'missing'
  let message = ''

  if (!token) {
    status = 'missing'
    message = isAmharic
      ? 'የማረጋገጫ ማስመሰያ አልተገኘም። እባክዎ በኢሜይልዎ የተላከውን አገናኝ ሙሉ በሙሉ ይክፈቱ።'
      : 'Verification token is missing. Please ensure you clicked the complete link in your confirmation email.'
  } else {
    try {
      const payload = await getPayload({ config: await configPromise })

      const query: Where = emailParam
        ? { email: { equals: emailParam } }
        : { status: { equals: 'pending' } }

      const candidateSubscribers = await payload.find({
        collection: 'subscribers',
        where: query,
        limit: 50,
        overrideAccess: true,
      })

      let matchedSubscriber = null

      for (const sub of candidateSubscribers.docs) {
        if (
          sub.confirmationTokenHash &&
          verifyTokenHash(token, sub.confirmationTokenHash)
        ) {
          matchedSubscriber = sub
          break
        }
      }

      if (!matchedSubscriber) {
        // If already confirmed with this email, show success
        if (emailParam) {
          const alreadySubscribed = await payload.find({
            collection: 'subscribers',
            where: {
              and: [
                { email: { equals: emailParam } },
                { status: { equals: 'subscribed' } },
              ],
            },
            limit: 1,
            overrideAccess: true,
          })

          if (alreadySubscribed.totalDocs > 0) {
            status = 'success'
            message = isAmharic
              ? 'ይህ የኢሜይል አድራሻ አስቀድሞ ተረጋግጧል! አዳዲስ ታሪኮች ሲታተሙ ይደርሱዎታል።'
              : 'Your email address is already verified and subscribed to Ethiopia Travel Journal.'
          } else {
            status = 'invalid'
            message = isAmharic
              ? 'የተሳሳተ ወይም ዋጋ የሌለው የማረጋገጫ አገናኝ ነው። እባክዎ እንደገና ይመዝገቡ።'
              : 'Invalid or already used confirmation link. Please sign up again to receive a fresh verification link.'
          }
        } else {
          status = 'invalid'
          message = isAmharic
            ? 'የተሳሳተ ወይም ዋጋ የሌለው የማረጋገጫ አገናኝ ነው። እባክዎ እንደገና ይመዝገቡ።'
            : 'Invalid or already used confirmation link. Please sign up again to receive a fresh verification link.'
        }
      } else if (isTokenExpired(matchedSubscriber.confirmationExpiresAt)) {
        status = 'expired'
        message = isAmharic
          ? 'ይህ የማረጋገጫ አገናኝ ጊዜው አልፎበታል (አገናኞች ለ48 ሰዓታት ብቻ ያገለግላሉ)። እባክዎ አዲስ የማረጋገጫ አገናኝ ይጠይቁ።'
          : 'This verification link has expired (links are valid for 48 hours). Please subscribe again to receive a new link.'
      } else {
        // Activate subscriber and clear single-use token
        await payload.update({
          collection: 'subscribers',
          id: matchedSubscriber.id,
          data: {
            status: 'subscribed',
            locale: isAmharic ? 'am' : matchedSubscriber.locale,
            confirmationTokenHash: null,
            confirmationExpiresAt: null,
          },
          overrideAccess: true,
        })

        status = 'success'
        message = isAmharic
          ? 'ምዝገባዎ በተሳካ ሁኔታ ተረጋግጧል! አዳዲስ የጉዞ ታሪኮች፣ ባህላዊ መጣጥፎች እና ምስሎች ወደ ኢሜይልዎ ይላካሉ።'
          : "You're all set! Your subscription has been confirmed and you will receive our latest travel stories, cultural essays, and photographic dispatches."
      }
    } catch (err) {
      console.error('[Confirmation Page Error]', err)
      status = 'invalid'
      message = isAmharic
        ? 'የማረጋገጫ ሂደቱ ላይ ያልተጠበቀ ስህተት ተከስቷል። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።'
        : 'An unexpected error occurred while verifying your subscription. Please try again later.'
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-background">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl p-8 sm:p-10 shadow-sm text-center">
        {status === 'success' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              {isAmharic ? 'የኢትዮጵያ ጉዞ ማስታወሻ' : 'ETHIOPIA TRAVEL JOURNAL'}
            </span>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-card-foreground mb-4">
              {isAmharic ? 'ምዝገባዎ ተረጋግጧል!' : 'Subscription Confirmed!'}
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
              {message}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={isAmharic ? "/stories?locale=am" : "/stories"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm"
              >
                {isAmharic ? 'ታሪኮችን ያስሱ' : 'Explore Stories'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={isAmharic ? "/?locale=am" : "/"}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors text-sm"
              >
                {isAmharic ? 'ወደ መነሻ ገጽ' : 'Home'}
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-9 h-9" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-card-foreground mb-4">
              {status === 'expired'
                ? isAmharic
                  ? 'የማረጋገጫ አገናኙ ጊዜ አልፎበታል'
                  : 'Verification Link Expired'
                : isAmharic
                ? 'ማረጋገጥ አልተቻለም'
                : 'Unable to Confirm Subscription'}
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
              {message}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={isAmharic ? "/stories?locale=am" : "/stories"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm"
              >
                <Mail className="w-4 h-4" />
                {isAmharic ? 'እንደገና ይመዝገቡ' : 'Subscribe Again'}
              </Link>
              <Link
                href={isAmharic ? "/?locale=am" : "/"}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors text-sm"
              >
                {isAmharic ? 'ወደ መነሻ ገጽ' : 'Back to Home'}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
