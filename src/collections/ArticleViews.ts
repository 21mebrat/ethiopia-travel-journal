import type { CollectionConfig } from 'payload'

export const ArticleViews: CollectionConfig = {
  slug: 'article-views',
  labels: {
    singular: {
      en: 'Article View',
      am: 'የጽሑፍ ዕይታ',
    },
    plural: {
      en: 'Article Views',
      am: 'የጽሑፍ ዕይታዎች',
    },
  },
  admin: {
    useAsTitle: 'viewKey',
    defaultColumns: ['article', 'dayBucket', 'createdAt'],
    description: {
      en: 'Internal atomic deduplication records for article views',
      am: 'የጽሑፍ ዕይታዎችን ለመመዝገብ የሚያገለግል የውስጥ መዝገብ',
    },
    // Keep sidebar clean; internal tracking collection
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user && (user.role === 'admin' || user.role === 'editor')),
    create: ({ req }) => Boolean(req.user?.role === 'admin' || req.context?.internalViewTracking),
    update: () => false, // Immutable view records
    delete: ({ req: { user } }) => Boolean(user && user.role === 'admin'),
  },
  fields: [
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      required: true,
      index: true,
      admin: {
        description: {
          en: 'The published article that was viewed.',
        },
      },
    },
    {
      name: 'visitorHash',
      type: 'text',
      required: true,
      index: true,
      admin: {
        readOnly: true,
        description: {
          en: 'Cryptographic pseudonymous hash of the visitor session.',
        },
      },
    },
    {
      name: 'dayBucket',
      type: 'number',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'viewKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: {
          en: 'Unique compound deduplication key: ${articleId}_${visitorHash}_${dayBucket}',
        },
      },
    },
  ],
  timestamps: true,
}
