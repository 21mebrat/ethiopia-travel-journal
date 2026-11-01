'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type CommentItem = {
  id: string
  authorName: string
  commentText: string
  createdAt: string
}

type ArticleCommentsProps = {
  articleId: string
  slug: string
  initialCommentCount?: number
  locale?: string
}

export default function ArticleComments({
  articleId,
  slug,
  initialCommentCount = 0,
  locale = 'en',
}: ArticleCommentsProps) {
  const isAmharic = locale === 'am'

  const [comments, setComments] = useState<CommentItem[]>([])
  const [totalComments, setTotalComments] = useState(initialCommentCount)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Form state
  const [authorName, setAuthorName] = useState('')
  const [email, setEmail] = useState('')
  const [commentText, setCommentText] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch comments on mount or article change without synchronous setState in effect
  useEffect(() => {
    let ignore = false

    async function fetchComments() {
      try {
        const res = await fetch(`/api/stories/comments?articleId=${encodeURIComponent(articleId)}`)
        const data = await res.json()
        if (ignore) return
        if (data.success && Array.isArray(data.comments)) {
          setComments(data.comments)
          setTotalComments(data.totalDocs || data.comments.length)
        } else {
          setFetchError(data.error || 'Failed to load comments')
        }
      } catch {
        if (!ignore) {
          setFetchError(isAmharic ? 'አስተያየቶችን መጫን አልተቻለም።' : 'Failed to load comments.')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    fetchComments()
    return () => {
      ignore = true
    }
  }, [articleId, isAmharic])

  // Explicit reload handler for retry or post-submission
  const reloadComments = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/stories/comments?articleId=${encodeURIComponent(articleId)}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.comments)) {
        setComments(data.comments)
        setTotalComments(data.totalDocs || data.comments.length)
      } else {
        setFetchError(data.error || 'Failed to load comments')
      }
    } catch {
      setFetchError(isAmharic ? 'አስተያየቶችን መጫን አልተቻለም።' : 'Failed to load comments.')
    } finally {
      setIsLoading(false)
    }
  }, [articleId, isAmharic])

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(false)

    // Basic client validation
    if (authorName.trim().length < 2) {
      setSubmitError(
        isAmharic
          ? 'እባክዎ ትክክለኛ ስም ያስገቡ (ቢያንስ 2 ፊደላት)።'
          : 'Please enter a valid display name (at least 2 characters).',
      )
      return
    }

    if (commentText.trim().length < 3) {
      setSubmitError(
        isAmharic
          ? 'እባክዎ አስተያየትዎን ያስገቡ (ቢያንስ 3 ፊደላት)።'
          : 'Please enter your comment (at least 3 characters).',
      )
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/stories/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          slug,
          authorName: authorName.trim(),
          email: email.trim() || undefined,
          comment: commentText.trim(),
          honeypot,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSubmitSuccess(true)
        setAuthorName('')
        setEmail('')
        setCommentText('')
      } else {
        setSubmitError(
          data.error ||
            (isAmharic
              ? 'አስተያየቱን ማስገባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
              : 'Failed to submit comment. Please try again.'),
        )
      }
    } catch {
      setSubmitError(
        isAmharic
          ? 'የአውታረ መረብ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።'
          : 'Network error occurred. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCommentDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return new Intl.DateTimeFormat(isAmharic ? 'am-ET' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d)
    } catch {
      return ''
    }
  }

  return (
    <section
      id="comments"
      aria-label={isAmharic ? 'የአንባቢያን አስተያየቶች' : 'Reader Comments'}
      className="article-comments mt-12 pt-8 border-t border-border"
    >
      {/* 1. Header with Approved Comments Count */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2.5">
          <MessageSquare size={20} className="text-primary" />
          <h2 className="font-serif text-2xl font-bold text-foreground">
            {isAmharic ? `አስተያየቶች (${totalComments})` : `Comments (${totalComments})`}
          </h2>
        </div>
      </div>

      {/* 2. Comments List */}
      <div className="space-y-6 mb-12">
        {isLoading ? (
          <div className="flex items-center gap-2.5 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 size={18} className="animate-spin text-primary" />
            <span>{isAmharic ? 'አስተያየቶችን በመጫን ላይ...' : 'Loading comments...'}</span>
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-between p-4 bg-destructive/10 text-destructive rounded-xs text-sm border border-destructive/20">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={reloadComments}
              className="text-xs underline font-medium hover:opacity-80"
            >
              {isAmharic ? 'እንደገና ሞክር' : 'Retry'}
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-6 text-center bg-card rounded-xs border border-border text-muted-foreground text-sm">
            <p>
              {isAmharic
                ? 'እስካሁን ምንም አስተያየት አልተሰጠም። የመጀመሪያውን አስተያየትዎን ከዚህ በታች ያጋሩ።'
                : 'No comments yet. Be the first to share your thoughts on this story below.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((item) => (
              <div
                key={item.id}
                className="p-5 bg-card text-card-foreground rounded-xs border border-border transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center uppercase shrink-0">
                      {item.authorName.charAt(0)}
                    </div>
                    <span className="font-semibold text-sm text-foreground">
                      {item.authorName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatCommentDate(item.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pl-9">
                  {item.commentText}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Comment Submission Form */}
      <div className="p-6 sm:p-8 bg-card text-card-foreground rounded-xs border border-border shadow-xs">
        <h3 className="font-serif text-xl font-bold text-foreground mb-1">
          {isAmharic ? 'አስተያየት ይስጡ' : 'Leave a Comment'}
        </h3>
        <p className="text-xs text-muted-foreground mb-6">
          {isAmharic
            ? 'የኢሜይል አድራሻዎ ለሕዝብ አይታይም። ሁሉም አስተያየቶች ከመታተማቸው በፊት ይገመገማሉ።'
            : 'Your email address is strictly private and never published. All comments are reviewed before appearing.'}
        </p>

        {/* Success Alert */}
        {submitSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 p-4 mb-6 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xs text-sm"
          >
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {isAmharic ? 'እናመሰግናለን!' : 'Thank you!'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">
                {isAmharic
                  ? 'አስተያየትዎ በተሳካ ሁኔታ ገብቷል። ከአስተዳዳሪው ግምገማ በኋላ በይፋ ይለጠፋል።'
                  : 'Your comment has been submitted and is awaiting editorial moderation.'}
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 p-3 mb-6 bg-destructive/10 text-destructive border border-destructive/20 rounded-xs text-xs"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot field for bot detection */}
          <div
            style={{ display: 'none' }}
            aria-hidden="true"
            className="hidden opacity-0 pointer-events-none"
          >
            <label htmlFor="website-trap">Leave this blank</label>
            <input
              id="website-trap"
              type="text"
              name="honeypot"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Author Display Name */}
            <div>
              <label
                htmlFor="comment-author-name"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {isAmharic ? 'ስም *' : 'Name *'}
              </label>
              <input
                id="comment-author-name"
                type="text"
                required
                maxLength={100}
                placeholder={isAmharic ? 'የእርስዎን ስም ያስገቡ' : 'Your display name'}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-sm bg-background text-foreground border border-input rounded-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>

            {/* Email Address (Optional, Strictly Private) */}
            <div>
              <label
                htmlFor="comment-author-email"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {isAmharic ? 'ኢሜይል (አማራጭ - የግል)' : 'Email (Optional - Private)'}
              </label>
              <input
                id="comment-author-email"
                type="email"
                maxLength={254}
                placeholder="reader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-sm bg-background text-foreground border border-input rounded-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          {/* Comment Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="comment-body"
                className="block text-xs font-semibold text-foreground"
              >
                {isAmharic ? 'አስተያየት *' : 'Comment *'}
              </label>
              <span className="text-[11px] text-muted-foreground">
                {commentText.length}/2000
              </span>
            </div>
            <textarea
              id="comment-body"
              required
              rows={4}
              maxLength={2000}
              placeholder={
                isAmharic
                  ? 'ስለዚህ ታሪክ ያለዎትን አስተያየት እዚህ ይጻፉ...'
                  : 'Write your thoughts on this story...'
              }
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-background text-foreground border border-input rounded-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50 leading-relaxed"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || authorName.trim().length < 2 || commentText.trim().length < 3}
              className="px-5 py-2.5 bg-primary text-primary-foreground font-medium text-xs rounded-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{isAmharic ? 'በመላክ ላይ...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>{isAmharic ? 'አስተያየት ላክ' : 'Post Comment'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
