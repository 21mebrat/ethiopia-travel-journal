import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { BlocksFeature, FixedToolbarFeature, lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Destinations } from './collections/Destinations'
import { Articles } from './collections/Articles'
import { ImageGallery } from './blocks/ImageGallery'
import { VisualMediaLayout } from './blocks/VisualMediaLayout'

import { en } from '@payloadcms/translations/languages/en'
import { am } from './i18n/am'
import { Comments } from './collections/Comments'
import { Advertisements } from './collections/Advertisements'
import { Subscribers } from './collections/Subscribers'
import { NewsletterBroadcasts } from './collections/NewsletterBroadcasts'
import { NewsletterDeliveries } from './collections/NewsletterDeliveries'
import {
  newsletterSubscribeHandler,
  newsletterGetHandler,
} from './endpoints/newsletterSubscribe'
import { newsletterConfirmHandler } from './endpoints/newsletterConfirm'
import {
  newsletterUnsubscribePostHandler,
  newsletterUnsubscribeGetHandler,
} from './endpoints/newsletterUnsubscribe'
import { getEmailAdapter } from './lib/email/adapter'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const configuredEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter((f) => f.key !== 'upload'),
    UploadFeature(),
    FixedToolbarFeature(),
    BlocksFeature({
      blocks: [ImageGallery, VisualMediaLayout],
    }),
  ],
})

// Ensures that Payload 3.91 preserves human-readable labels for all slash menu commands
// across both English and Amharic admin locales
const editor: typeof configuredEditor = async (args) => {
  const result = await configuredEditor(args)
  if (!args.config.i18n) args.config.i18n = {} as any
  if (!args.config.i18n.translations) args.config.i18n.translations = {}
  const translations = args.config.i18n.translations as Record<string, any>
  if (!translations.en) translations.en = {}
  if (!translations.am) translations.am = {}

  const enLexical = (translations.en.lexical ??= {})
  enLexical.checklist = { label: 'Checklist' }
  enLexical.blockquote = { label: 'Quote' }

  translations.am.lexical = {
    ...enLexical,
    checklist: { label: 'Checklist' },
    heading: { label: 'ርዕስ {{headingLevel}}' },
    paragraph: { label: 'አንቀጽ', label2: 'መደበኛ ጽሑፍ' },
    blockquote: { label: 'ጥቅስ (Quote)' },
    orderedList: { label: 'ቁጥር ያለው ዝርዝር (Ordered List)' },
    unorderedList: { label: 'ነጥብ ያለው ዝርዝር (Unordered List)' },
    upload: { label: 'ፋይል ስቀል (Upload)' },
    relationship: { label: 'ዝምድና (Relationship)' },
    link: { label: 'አገናኝ (Link)', loadingWithEllipsis: 'በመጫን ላይ...' },
    horizontalRule: { label: 'አግድም መስመር (Divider)' },
    blocks: {
      label: 'ብሎኮች (Blocks)',
      inlineBlocks: { label: 'የመስመር ውስጥ ብሎኮች' },
    },
    general: {
      placeholder: "መጻፍ ይጀምሩ፣ ወይም ለትዕዛዞች '/' ይጫኑ...",
      slashMenuBasicGroupLabel: 'መሰረታዊ (Basic)',
      slashMenuListGroupLabel: 'ዝርዝሮች (Lists)',
      toolbarItemsActive: '{{count}} ንቁ',
    },
  }

  return result
}

export default buildConfig({
  admin: {
    avatar: "default",
    autoLogin: process.env.NODE_ENV === "development" ? {
      email: "maytotmat@gmail.com",
      password: "test",
      prefillOnly: false,
    } : false,
    autoRefresh: true,
    components: {
      // before login , compoent render above the login form
      beforeLogin: [
        "/components/payload/WelcomeMessage"
      ],
      // after login , compoent render below the login form
      // afterLogin: [
      //   "/components/payload/AfterLogin"
      // ],
      // Custom dashboard view: shadcn/dashboard-01 layout powered by our
      // Payload collections (articles, destinations, media, users).
      views: {
        dashboard: {
          Component: '/components/admin/Dashboard',
        },
      },
      // Replace the entire sidebar with a shadcn dashboard-01 style nav that
      // is driven by Payload's collections, permissions and nav context.
      Nav: '/components/admin/Nav',
      // Brand block rendered above the collection links in the sidebar.
      // (Dashboard-01 nav owns its own brand, dashboard link and footer.)
      // beforeNavLinks: ['/components/admin/SidebarBrand', '/components/admin/DashboardLink'],
      // Utility links rendered below the collection links.
      // afterNavLinks: ['/components/admin/SidebarFooterLinks'],
      // graphcs
      graphics: {
        Icon: "/components/graphics/Icon",
        Logo: "/components/graphics/Logo"
      },
      // header: [
      //   "/components/Header"
      // ],
      logout: {
        Button: "/components/LogoutButton"
      },      // header: [
      //   "/components/Header"
      // ],
      // providers render the top navbar
      providers: [
        "/components/payload/PerformancePatch",
        "/components/payload/MediaEditorEnhancer"
      ]
    },
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    suppressHydrationWarning: true,
  },
  collections: [
    Users,
    Media,
    Categories,
    Destinations,
    Articles,
    Comments,
    Advertisements,
    Subscribers,
    NewsletterBroadcasts,
    NewsletterDeliveries,
  ],
  localization: {
    locales: [
      {
        label: "English",
        code: "en",
      },
      {
        label: "Amharic",
        code: "am",
        fallbackLocale: "en"
      }
    ],
    defaultLocale: "en",
    fallback: true
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: {
      en,
      am,
    } as any,
    translations: {
      en: {
        lexical: {
          checklist: {
            label: 'Checklist',
          },
          blockquote: {
            label: 'Quote',
          },
          heading: {
            label: 'Heading {{headingLevel}}',
          },
          paragraph: {
            label: 'Paragraph',
            label2: 'Normal Text',
          },
          orderedList: {
            label: 'Ordered List',
          },
          unorderedList: {
            label: 'Unordered List',
          },
          upload: {
            label: 'Upload',
          },
          relationship: {
            label: 'Relationship',
          },
          link: {
            label: 'Link',
            loadingWithEllipsis: 'Loading...',
          },
          horizontalRule: {
            label: 'Horizontal Rule',
          },
          blocks: {
            label: 'Blocks',
            inlineBlocks: {
              label: 'Inline Blocks',
            },
          },
        },
      },
      am: {
        lexical: {
          checklist: {
            label: 'Checklist',
          },
          heading: {
            label: 'ርዕስ {{headingLevel}}',
          },
          paragraph: {
            label: 'አንቀጽ',
            label2: 'መደበኛ ጽሑፍ',
          },
          blockquote: {
            label: 'ጥቅስ (Quote)',
          },
          orderedList: {
            label: 'ቁጥር ያለው ዝርዝር (Ordered List)',
          },
          unorderedList: {
            label: 'ነጥብ ያለው ዝርዝር (Unordered List)',
          },
          upload: {
            label: 'ፋይል ስቀል (Upload)',
          },
          relationship: {
            label: 'ዝምድና (Relationship)',
          },
          link: {
            label: 'አገናኝ (Link)',
            loadingWithEllipsis: 'በመጫን ላይ...',
          },
          horizontalRule: {
            label: 'አግድም መስመር (Divider)',
          },
          blocks: {
            label: 'ብሎኮች (Blocks)',
            inlineBlocks: {
              label: 'የመስመር ውስጥ ብሎኮች',
            },
          },
          general: {
            placeholder: "መጻፍ ይጀምሩ፣ ወይም ለትዕዛዞች '/' ይጫኑ...",
            slashMenuBasicGroupLabel: 'መሰረታዊ (Basic)',
            slashMenuListGroupLabel: 'ዝርዝሮች (Lists)',
            toolbarItemsActive: '{{count}} ንቁ',
          },
        },
      },
    } as any,
  },
  editor,
  email: getEmailAdapter(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  endpoints: [
    {
      path: '/newsletter/subscribe',
      method: 'post',
      handler: newsletterSubscribeHandler,
    },
    {
      path: '/newsletter/subscribe',
      method: 'get',
      handler: newsletterGetHandler,
    },
    {
      path: '/newsletter/confirm',
      method: 'post',
      handler: newsletterConfirmHandler,
    },
    {
      path: '/newsletter/confirm',
      method: 'get',
      handler: newsletterConfirmHandler,
    },
    {
      path: '/newsletter/unsubscribe',
      method: 'post',
      handler: newsletterUnsubscribePostHandler,
    },
    {
      path: '/newsletter/unsubscribe',
      method: 'get',
      handler: newsletterUnsubscribeGetHandler,
    },
  ],
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [],
})
