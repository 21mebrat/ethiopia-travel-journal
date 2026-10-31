'use client'

import React, { useState } from 'react'
import { Link2, Mail, Check, AlertCircle } from 'lucide-react'

type SocialShareBarProps = {
  url?: string
  title?: string
  variant?: 'inline' | 'sidebar'
  locale?: string
  className?: string
}

function FacebookIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function TwitterXIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function PinterestIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
  )
}

function LinkedInIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  )
}

export default function SocialShareBar({
  url,
  title = 'Ethiopia Travel Journal Story',
  variant = 'inline',
  locale = 'en',
  className = '',
}: SocialShareBarProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const isAmharic = locale === 'am'

  const shareUrl =
    url || (typeof window !== 'undefined' ? window.location.href : 'https://ethiopia-travel-journal.com')

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setCopyStatus('copied')
        setTimeout(() => setCopyStatus('idle'), 2000)
        return
      }

      // Fallback for non-https or browsers lacking clipboard API
      if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (successful) {
          setCopyStatus('copied')
          setTimeout(() => setCopyStatus('idle'), 2000)
          return
        }
      }

      setCopyStatus('failed')
      setTimeout(() => setCopyStatus('idle'), 3000)
    } catch {
      setCopyStatus('failed')
      setTimeout(() => setCopyStatus('idle'), 3000)
    }
  }

  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(title)

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=Read%20this%20story:%20${encodedUrl}`,
  }

  if (variant === 'sidebar') {
    return (
      <div className={`share-sidebar-widget mb-8 ${className}`} aria-label={isAmharic ? 'ይህንን ታሪክ አጋራ' : 'Share This Story'}>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xs uppercase tracking-[0.16em] font-bold text-foreground whitespace-nowrap">
            {isAmharic ? 'ይህንን ታሪክ አጋራ' : 'Share This Story'}
          </h3>
          <span className="h-[1px] bg-border flex-1" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={shareLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Facebook"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            <FacebookIcon size={14} />
          </a>

          <a
            href={shareLinks.twitter}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            <TwitterXIcon size={13} />
          </a>

          <a
            href={shareLinks.pinterest}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Pinterest"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            <PinterestIcon size={14} />
          </a>

          <a
            href={shareLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on LinkedIn"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            <LinkedInIcon size={13} />
          </a>

          <a
            href={shareLinks.email}
            aria-label="Share via Email"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            <Mail size={14} />
          </a>

          {/* Copy link button */}
          <div className="relative">
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy story link"
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-colors cursor-pointer"
            >
              {copyStatus === 'copied' ? (
                <Check size={14} className="text-foreground" />
              ) : copyStatus === 'failed' ? (
                <AlertCircle size={14} className="text-destructive" />
              ) : (
                <Link2 size={14} />
              )}
            </button>
            {copyStatus === 'copied' && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded bg-popover text-popover-foreground border border-border text-[10px] whitespace-nowrap shadow-xs animate-in fade-in duration-150">
                {isAmharic ? 'ተቀድቷል!' : 'Copied!'}
              </span>
            )}
            {copyStatus === 'failed' && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-[10px] whitespace-nowrap shadow-xs animate-in fade-in duration-150">
                {isAmharic ? 'መቅዳት አልተቻለም' : 'Copy failed'}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Inline Hero Variant (Overlaid on photograph: preserve intentional photographic contrast)
  return (
    <div className={`flex items-center gap-2.5 text-white/90 ${className}`}>
      <span className="text-xs uppercase tracking-wider font-semibold text-white/80">
        {isAmharic ? 'አጋራ:' : 'Share:'}
      </span>

      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label="Copy link"
          className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white/90 hover:text-white"
        >
          {copyStatus === 'copied' ? (
            <Check size={14} className="text-white" />
          ) : copyStatus === 'failed' ? (
            <AlertCircle size={14} className="text-rose-400" />
          ) : (
            <Link2 size={14} />
          )}
        </button>
        {copyStatus === 'copied' && (
          <span className="absolute -top-7 left-0 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] whitespace-nowrap shadow-md">
            {isAmharic ? 'ተቀድቷል!' : 'Copied!'}
          </span>
        )}
        {copyStatus === 'failed' && (
          <span className="absolute -top-7 left-0 px-2 py-0.5 rounded bg-rose-900/90 text-white text-[10px] whitespace-nowrap shadow-md">
            {isAmharic ? 'መቅዳት አልተቻለም' : 'Copy failed'}
          </span>
        )}

        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/90 hover:text-white"
        >
          <FacebookIcon size={14} />
        </a>

        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/90 hover:text-white"
        >
          <TwitterXIcon size={13} />
        </a>

        <a
          href={shareLinks.pinterest}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Pinterest"
          className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/90 hover:text-white flex items-center justify-center"
        >
          <PinterestIcon size={14} />
        </a>

        <a
          href={shareLinks.email}
          aria-label="Share by Email"
          className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/90 hover:text-white"
        >
          <Mail size={14} />
        </a>
      </div>
    </div>
  )
}
