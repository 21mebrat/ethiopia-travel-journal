import type { CollectionConfig } from 'payload'

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: {
    singular: {
      en: 'Subscriber',
      am: 'ተመዝጋቢ',
    },
    plural: {
      en: 'Subscribers',
      am: 'ተመዝጋቢዎች',
    },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'locale', 'source', 'createdAt'],
    description: {
      en: 'Manage email subscribers to the Ethiopia Travel Journal newsletter.',
      am: 'የኢትዮጵያ ጉዞ ማስታወሻ የዜና መጽሔት ተመዝጋቢዎችን ያስተዳድሩ።',
    },
    listSearchableFields: ['email', 'source'],
  },
  // Protected collection: Public cannot write directly to bypass double opt-in endpoint
  access: {
    read: ({ req: { user } }) => Boolean(user && ['admin', 'editor'].includes(user.role as string)),
    create: ({ req: { user } }) => Boolean(user && ['admin', 'editor'].includes(user.role as string)),
    update: ({ req: { user } }) => Boolean(user && ['admin', 'editor'].includes(user.role as string)),
    delete: ({ req: { user } }) => Boolean(user && (user.role as string) === 'admin'),
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      label: {
        en: 'Email Address',
        am: 'የኢሜይል አድራሻ',
      },
      hooks: {
        beforeValidate: [
          ({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
        ],
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        {
          label: {
            en: 'Pending Confirmation',
            am: 'ማረጋገጫ በመጠባበቅ ላይ',
          },
          value: 'pending',
        },
        {
          label: {
            en: 'Subscribed (Confirmed)',
            am: 'የተመዘገበ (የተረጋገጠ)',
          },
          value: 'subscribed',
        },
        {
          label: {
            en: 'Unsubscribed',
            am: 'የተሰረዘ',
          },
          value: 'unsubscribed',
        },
      ],
      label: {
        en: 'Subscription Status',
        am: 'የምዝገባ ሁኔታ',
      },
    },
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'en',
      options: [
        {
          label: {
            en: 'English',
            am: 'English (እንግሊዝኛ)',
          },
          value: 'en',
        },
        {
          label: {
            en: 'Amharic',
            am: 'አማርኛ',
          },
          value: 'am',
        },
      ],
      label: {
        en: 'Preferred Language',
        am: 'ተመራጭ ቋንቋ',
      },
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'website',
      label: {
        en: 'Signup Source',
        am: 'የተመዘገበበት ምንጭ',
      },
    },
    {
      name: 'confirmationTokenHash',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: {
          en: 'SHA-256 hash of single-use confirmation token.',
          am: 'የማረጋገጫ ማስመሰያ የSHA-256 ሃሽ።',
        },
      },
      access: {
        read: ({ req: { user } }) => Boolean(user && user.role === 'admin'),
      },
    },
    {
      name: 'confirmationExpiresAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: {
          en: 'Timestamp when confirmation link expires.',
          am: 'የማረጋገጫ አገናኝ የሚያበቃበት ጊዜ።',
        },
      },
      access: {
        read: ({ req: { user } }) => Boolean(user && user.role === 'admin'),
      },
    },
    {
      name: 'unsubscribeTokenHash',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: {
          en: 'SHA-256 hash of secure unsubscribe token.',
          am: 'ከዝርዝር የመውጫ ማስመሰያ የSHA-256 ሃሽ።',
        },
      },
      access: {
        read: ({ req: { user } }) => Boolean(user && user.role === 'admin'),
      },
    },
    {
      name: 'tokenVersion',
      type: 'number',
      defaultValue: 2,
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}
