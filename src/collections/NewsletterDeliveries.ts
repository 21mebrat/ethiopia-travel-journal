import type { CollectionConfig } from 'payload'

export const NewsletterDeliveries: CollectionConfig = {
  slug: 'newsletter-deliveries',
  labels: {
    singular: {
      en: 'Newsletter Delivery',
      am: 'የዜና መጽሔት ልክ',
    },
    plural: {
      en: 'Newsletter Deliveries',
      am: 'የዜና መጽሔት ልኮች',
    },
  },
  admin: {
    useAsTitle: 'deliveryKey',
    defaultColumns: ['recipientEmail', 'status', 'attempts', 'sentAt', 'lastError'],
    description: {
      en: 'Per-recipient delivery state with stable unique keys for at-least-once newsletter reliability.',
      am: 'በእያንዳንዱ ተቀባይ የተላከበት ሁኔታ መዝገብ።',
    },
    group: {
      en: 'Newsletter',
      am: 'ዜና መጽሔት',
    },
  },
  access: {
    read: ({ req: { user } }) => Boolean(user && ['admin', 'editor'].includes(user.role as string)),
    create: ({ req: { user } }) => Boolean(user && ['admin', 'editor'].includes(user.role as string)),
    update: ({ req: { user } }) => Boolean(user && ['admin', 'editor'].includes(user.role as string)),
    delete: ({ req: { user } }) => Boolean(user && (user.role as string) === 'admin'),
  },
  fields: [
    {
      name: 'broadcast',
      type: 'relationship',
      relationTo: 'newsletter-broadcasts',
      required: true,
      index: true,
      label: {
        en: 'Broadcast Event',
        am: 'የስርጭት ሁነት',
      },
    },
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      required: true,
      index: true,
      label: {
        en: 'Article',
        am: 'ጽሑፍ',
      },
    },
    {
      name: 'subscriber',
      type: 'relationship',
      relationTo: 'subscribers',
      required: true,
      index: true,
      label: {
        en: 'Subscriber',
        am: 'ተመዝጋቢ',
      },
    },
    {
      name: 'recipientEmail',
      type: 'email',
      required: true,
      label: {
        en: 'Recipient Email',
        am: 'የተቀባይ ኢሜይል',
      },
    },
    {
      name: 'deliveryKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: {
          en: 'Stable uniqueness key (${articleId}_${subscriberId}) preventing duplicate delivery across worker retries.',
          am: 'ተደጋጋሚ ልኮችን የሚከላከል ልዩ መለያ።',
        },
      },
      label: {
        en: 'Delivery Key',
        am: 'የልክ መለያ',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: { en: 'Pending', am: 'በመጠባበቅ ላይ' }, value: 'pending' },
        { label: { en: 'Sending', am: 'በመላክ ላይ' }, value: 'sending' },
        { label: { en: 'Sent', am: 'የተላከ' }, value: 'sent' },
        { label: { en: 'Failed', am: 'ያልተሳካ' }, value: 'failed' },
        { label: { en: 'Skipped', am: 'የተዘለለ' }, value: 'skipped' },
      ],
      label: {
        en: 'Delivery Status',
        am: 'የልክ ሁኔታ',
      },
    },
    {
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
      label: {
        en: 'Delivery Attempts',
        am: 'የሙከራ ብዛት',
      },
    },
    {
      name: 'lastError',
      type: 'text',
      label: {
        en: 'Last Error Message',
        am: 'የመጨረሻው የስህተት መልእክት',
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: {
        en: 'Sent At',
        am: 'የተላከበት ጊዜ',
      },
    },
    {
      name: 'workerId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        description: {
          en: 'Identifier of the worker instance currently leasing this delivery.',
          am: 'ይህንን ልክ እያከናወነ ያለው የሰራተኛ መለያ።',
        },
      },
      label: {
        en: 'Worker ID',
        am: 'የሰራተኛ መለያ',
      },
    },
    {
      name: 'leaseClaimedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
      label: {
        en: 'Lease Claimed At',
        am: 'የይዞታ መጀመሪያ ጊዜ',
      },
    },
    {
      name: 'leaseExpiresAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
      },
      label: {
        en: 'Lease Expires At',
        am: 'የይዞታ ማብቂያ ጊዜ',
      },
    },
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: { en: 'English', am: 'እንግሊዝኛ' }, value: 'en' },
        { label: { en: 'Amharic', am: 'አማርኛ' }, value: 'am' },
      ],
      label: {
        en: 'Sent Locale',
        am: 'የተላከበት ቋንቋ',
      },
    },
  ],
  timestamps: true,
}
