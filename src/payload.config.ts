import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Destinations } from './collections/Destinations'
import { Articles } from './collections/Articles'

import { en } from '@payloadcms/translations/languages/en'
import { am } from './i18n/am'
import { Comments } from './collections/Comments'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    avatar: "default",
    autoLogin: process.env.NODE_ENV === "development" ? {
      email: "dev@payloadcms.com",
      password: "test",
      prefillOnly: true,
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
        "/components/payload/PerformancePatch"
      ]
    },
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    suppressHydrationWarning: true,
  },
  collections: [Users, Media, Categories, Destinations, Articles, Comments],
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
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [],
})
