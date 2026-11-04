import type { CollectionConfig } from 'payload'
import {
  createLexicalCommentBody,
  reconcileArticleMetrics,
} from '../lib/site/engagement'

function getArticleId(article: any): string | null {
  if (!article) return null
  if (typeof article === 'string') return article
  if (typeof article === 'number') return String(article)
  if (typeof article === 'object' && article.id) return String(article.id)
  if (typeof article === 'object' && article._id) return String(article._id)
  return null
}

export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: {
    singular: {
      en: 'Comment',
      am: 'አስተያየት',
    },
    plural: {
      en: 'Comments',
      am: 'አስተያየቶች',
    },
  },
  admin: {
    useAsTitle: 'full_name',
    defaultColumns: ['full_name', 'article', 'status', 'createdAt'],
    description: {
      en: 'Manage moderated reader comments on published travel stories.',
      am: 'በታተሙ የጉዞ ታሪኮች ላይ የተሰጡ የአንባቢያን አስተያየቶችን ያስተዳድሩ።',
    },
    listSearchableFields: ['full_name', 'email', 'phone', 'commentText'],
  },
  access: {
    // Public unauthenticated readers can ONLY see approved comments.
    // Staff (admins and editors) can see all statuses (pending, approved, rejected).
    read: ({ req: { user } }) => {
      if (user && (user.role === 'admin' || user.role === 'editor')) {
        return true
      }
      return {
        status: {
          equals: 'approved',
        },
      }
    },
    // Public visitors can submit comments (status is forced to 'pending' server-side)
    create: () => true,
    // Only staff can update or moderate comments
    update: ({ req: { user } }) =>
      Boolean(user && (user.role === 'admin' || user.role === 'editor')),
    // Only staff can delete comments
    delete: ({ req: { user } }) =>
      Boolean(user && (user.role === 'admin' || user.role === 'editor')),
  },
  fields: [
    // ------------------------------------------------------------------------
    // Article Relationship
    // ------------------------------------------------------------------------
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      index: true,
      label: {
        en: 'Article',
        am: 'ጽሑፍ',
      },
      admin: {
        description: {
          en: 'The published article this comment belongs to. Required for new public comments.',
          am: 'ይህ አስተያየት የተሰጠበት የታተመ ጽሑፍ። ለአዳዲስ የሕዝብ አስተያየቶች ግዴታ ነው።',
        },
      },
      validate: (val: any, { operation, req }: any) => {
        const isStaffOrLocal = Boolean(
          (req?.user && (req.user.role === 'admin' || req.user.role === 'editor')) ||
          (req?.payloadAPI === 'local' && !req?.context?.isPublicSubmission),
        )
        // Public creations strictly require an article
        if (operation === 'create' && !isStaffOrLocal && !val) {
          return 'An article must be selected for this comment.'
        }
        return true
      },
    },

    // ------------------------------------------------------------------------
    // Moderation Status (Server Protected)
    // ------------------------------------------------------------------------
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      index: true,
      options: [
        { label: { en: 'Pending Moderation', am: 'በግምገማ ላይ ያለ' }, value: 'pending' },
        { label: { en: 'Approved', am: 'የተፈቀደ' }, value: 'approved' },
        { label: { en: 'Rejected', am: 'ውድቅ የተደረገ' }, value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'Only approved comments are publicly displayed on the story.',
          am: 'የተፈቀዱ አስተያየቶች ብቻ በይፋ ይታያሉ።',
        },
      },
      access: {
        // Enforce server-side protection: only staff or internal processes can set or update status
        create: ({ req }) =>
          Boolean(
            (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) ||
            (req.payloadAPI === 'local' && !req.context?.isPublicSubmission),
          ),
        update: ({ req }) =>
          Boolean(
            (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) ||
            (req.payloadAPI === 'local' && !req.context?.isPublicSubmission),
          ),
      },
    },

    // ------------------------------------------------------------------------
    // Comment Author Display Name
    // ------------------------------------------------------------------------
    {
      name: 'full_name',
      type: 'text',
      localized: true,
      maxLength: 100,
      label: {
        en: 'Display Name',
        am: 'ሙሉ ስም',
      },
      admin: {
        placeholder: {
          en: 'e.g. Almaz Tadesse',
          am: 'ለምሳሌ፡ አልማዝ ታደሰ',
        },
      },
    },

    // ------------------------------------------------------------------------
    // Author Email (Strictly Private - Hidden from Public API)
    // ------------------------------------------------------------------------
    {
      name: 'email',
      type: 'email',
      localized: true,
      label: {
        en: 'Email Address (Private)',
        am: 'የኢሜይል አድራሻ (የግል)',
      },
      admin: {
        description: {
          en: 'Private email for moderation contact. Never shown publicly to readers.',
          am: 'ለግምገማ ብቻ የሚያገለግል የግል ኢሜይል፤ በይፋ ለአንባቢያን አይታይም።',
        },
      },
      access: {
        // Server-side privacy protection: Public readers NEVER see commenter email
        read: ({ req }) =>
          Boolean(
            (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) ||
            (req.payloadAPI === 'local' && !req.context?.isPublicQuery),
          ),
        create: () => true,
        update: ({ req }) =>
          Boolean(
            (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) ||
            (req.payloadAPI === 'local' && !req.context?.isPublicSubmission),
          ),
      },
    },

    // ------------------------------------------------------------------------
    // Legacy Phone Field (Strictly Private)
    // ------------------------------------------------------------------------
    {
      name: 'phone',
      type: 'text',
      localized: true,
      label: {
        en: 'Phone (Private)',
        am: 'ስልክ (የግል)',
      },
      access: {
        read: ({ req }) =>
          Boolean(
            (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) ||
            (req.payloadAPI === 'local' && !req.context?.isPublicQuery),
          ),
        create: () => true,
        update: ({ req }) =>
          Boolean(
            (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) ||
            (req.payloadAPI === 'local' && !req.context?.isPublicSubmission),
          ),
      },
    },

    // ------------------------------------------------------------------------
    // Plain Text Comment (Sanitized Input)
    // ------------------------------------------------------------------------
    {
      name: 'commentText',
      type: 'textarea',
      maxLength: 2000,
      label: {
        en: 'Comment Content',
        am: 'የአስተያየት ይዘት',
      },
      admin: {
        rows: 4,
        description: {
          en: 'Sanitized plain text comment (max 2,000 characters).',
          am: 'የተጣራ የአስተያየት ጽሑፍ (እስከ 2,000 ፊደላት)።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // RichText Body (Preserved for backward compatibility & Admin Lexical Editor)
    // ------------------------------------------------------------------------
    {
      name: 'body',
      type: 'richText',
      required: false,
      localized: true,
      label: {
        en: 'Rich Text Body (Legacy/Editor)',
        am: 'አስተያየት (Lexical)',
      },
      admin: {
        description: {
          en: 'Lexical rich text format automatically synchronized with comment content.',
          am: 'ከአስተያየቱ ጽሑፍ ጋር የሚመሳሰል የLexical ቅርጸት።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // Moderation Audit Fields
    // ------------------------------------------------------------------------
    {
      name: 'moderatedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      access: {
        read: ({ req: { user } }) =>
          Boolean(user && (user.role === 'admin' || user.role === 'editor')),
        update: () => false,
      },
    },
    {
      name: 'moderatedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      access: {
        read: ({ req: { user } }) =>
          Boolean(user && (user.role === 'admin' || user.role === 'editor')),
        update: () => false,
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const isStaffOrLocal = Boolean(
          (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) ||
          (req.payloadAPI === 'local' && !req.context?.isPublicSubmission),
        )

        // 1. Enforce moderation status security: Non-staff can NEVER approve comments
        if (!isStaffOrLocal) {
          data.status = 'pending'
        }

        // 2. Synchronize plain text commentText with Lexical richText body
        if (data.commentText && typeof data.commentText === 'string') {
          const trimmed = data.commentText.trim()
          if (!data.body || typeof data.body !== 'object') {
            data.body = createLexicalCommentBody(trimmed)
          }
        }

        // 3. Moderation audit tracking
        const wasApproved = originalDoc?.status === 'approved'
        const willBeApproved = (data.status ?? originalDoc?.status) === 'approved'
        if (isStaffOrLocal && originalDoc && originalDoc.status !== data.status) {
          data.moderatedAt = new Date().toISOString()
          data.moderatedBy = req.user?.id
        }

        // 4. Store pre-mutation transition state in request context for atomic synchronization
        const oldArticleId = getArticleId(originalDoc?.article)
        const newArticleId = getArticleId(data.article ?? originalDoc?.article)

        if (!req.context) req.context = {}
        ;(req.context as any).commentMutation = {
          wasApproved,
          willBeApproved,
          oldArticleId,
          newArticleId,
          statusChanged: wasApproved !== willBeApproved,
          articleChanged: Boolean(oldArticleId && newArticleId && oldArticleId !== newArticleId),
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        const mutation = (req.context as any)?.commentMutation
        const currentArticleId = getArticleId(doc.article)

        // If approval status changed or article reassigned, update the affected article(s)
        if (mutation?.statusChanged || mutation?.articleChanged) {
          if (mutation.oldArticleId && mutation.oldArticleId !== currentArticleId) {
            try {
              await reconcileArticleMetrics(req.payload, mutation.oldArticleId)
            } catch (err) {
              req.payload.logger.error(
                `Failed to reconcile old article metrics for ${mutation.oldArticleId}: ${err}`,
              )
            }
          }

          if (currentArticleId) {
            try {
              await reconcileArticleMetrics(req.payload, currentArticleId)
            } catch (err) {
              req.payload.logger.error(
                `Failed to reconcile article metrics for ${currentArticleId}: ${err}`,
              )
            }
          }
        } else if (doc.status === 'approved' && currentArticleId && !mutation) {
          // Direct creation or fresh sync
          try {
            await reconcileArticleMetrics(req.payload, currentArticleId)
          } catch (err) {
            req.payload.logger.error(
              `Failed to reconcile article metrics for ${currentArticleId}: ${err}`,
            )
          }
        }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        // If an approved comment was deleted, recount and update engagement score
        const articleId = getArticleId(doc.article)
        if (doc.status === 'approved' && articleId) {
          try {
            await reconcileArticleMetrics(req.payload, articleId)
          } catch (err) {
            req.payload.logger.error(
              `Failed to reconcile article metrics after comment deletion for ${articleId}: ${err}`,
            )
          }
        }
      },
    ],
  },
  timestamps: true,
}
