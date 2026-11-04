import type { CollectionConfig } from 'payload'

export const NewsletterBroadcasts: CollectionConfig = {
  slug: 'newsletter-broadcasts',
  labels: {
    singular: {
      en: 'Newsletter Broadcast',
      am: 'የዜና መጽሔት ስርጭት',
    },
    plural: {
      en: 'Newsletter Broadcasts',
      am: 'የዜና መጽሔት ስርጭቶች',
    },
  },
  admin: {
    useAsTitle: 'article',
    defaultColumns: ['article', 'status', 'totalRecipients', 'sentCount', 'failedCount', 'createdAt'],
    description: {
      en: 'Tracks automated article newsletter broadcast events and execution status.',
      am: 'የጽሑፎች ራስ-ሰር የዜና መጽሔት ስርጭት ሁኔታዎችን ይከታተላል።',
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
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      required: true,
      unique: true,
      index: true,
      label: {
        en: 'Article',
        am: 'ጽሑፍ',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: { en: 'Pending', am: 'በመጠባበቅ ላይ' }, value: 'pending' },
        { label: { en: 'Processing', am: 'በሂደት ላይ' }, value: 'processing' },
        { label: { en: 'Completed', am: 'የተጠናቀቀ' }, value: 'completed' },
        { label: { en: 'Failed', am: 'ያልተሳካ' }, value: 'failed' },
        { label: { en: 'Partial', am: 'በከፊል የተሳካ' }, value: 'partial' },
      ],
      label: {
        en: 'Broadcast Status',
        am: 'የስርጭት ሁኔታ',
      },
    },
    {
      name: 'fanoutStatus',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: { en: 'Pending', am: 'በመጠባበቅ ላይ' }, value: 'pending' },
        { label: { en: 'In Progress', am: 'በሂደት ላይ' }, value: 'in_progress' },
        { label: { en: 'Completed', am: 'የተጠናቀቀ' }, value: 'completed' },
      ],
      admin: {
        readOnly: true,
        description: {
          en: 'Tracks whether recipient delivery rows have all been created.',
          am: 'የተቀባዮች ዝርዝር ሙሉ በሙሉ መፈጠሩን ይከታተላል።',
        },
      },
      label: {
        en: 'Fanout Status',
        am: 'የስርጭት ዝግጅት ሁኔታ',
      },
    },
    {
      name: 'fanoutCompletedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
      label: {
        en: 'Fanout Completed At',
        am: 'የስርጭት ዝግጅት የተጠናቀቀበት ጊዜ',
      },
    },
    {
      name: 'totalRecipients',
      type: 'number',
      defaultValue: 0,
      label: {
        en: 'Total Recipients',
        am: 'ጠቅላላ ተቀባዮች',
      },
    },
    {
      name: 'sentCount',
      type: 'number',
      defaultValue: 0,
      label: {
        en: 'Successfully Sent',
        am: 'በተሳካ ሁኔታ የተላኩ',
      },
    },
    {
      name: 'failedCount',
      type: 'number',
      defaultValue: 0,
      label: {
        en: 'Failed Deliveries',
        am: 'ያልተሳኩ ልኮች',
      },
    },
    {
      name: 'skippedCount',
      type: 'number',
      defaultValue: 0,
      label: {
        en: 'Skipped (Unconfirmed / Unsubscribed)',
        am: 'የተዘለሉ (ያልተረጋገጡ/የተሰረዙ)',
      },
    },
    {
      name: 'enqueuedAt',
      type: 'date',
      label: {
        en: 'Enqueued At',
        am: 'ወደ ዝርዝር የገባበት ጊዜ',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      label: {
        en: 'Completed At',
        am: 'የተጠናቀቀበት ጊዜ',
      },
    },
  ],
  timestamps: true,
}
