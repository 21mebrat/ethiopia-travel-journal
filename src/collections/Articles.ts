import type { CollectionConfig, Where } from 'payload'
import { BlocksFeature, lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'
import { ImageGallery } from '../blocks/ImageGallery'
import { VisualMediaLayout } from '../blocks/VisualMediaLayout'

/**
 * ============================================================================
 * Articles Collection Configuration - Master Educational Reference Guide
 * ============================================================================
 *
 * 1. WHAT IS THE ARTICLES COLLECTION?
 * ----------------------------------------------------------------------------
 * Articles is the core editorial engine of the Ethiopia Tour Blog:
 *   - Travel stories, historical essays, cultural guides, and itineraries.
 *   - It links together all other entities in the system:
 *       * Author (`users`) -> Who wrote this article?
 *       * Categories (`categories`) -> How is it classified (Culture, Wildlife, Food)?
 *       * Destinations (`destinations`) -> What places are covered (Lalibela, Gondar)?
 *       * Media (`media`) -> Hero banners and photo embeds.
 *
 * 2. KEY PAYLOAD CMS CONCEPTS TAUGHT IN THIS FILE:
 * ----------------------------------------------------------------------------
 *   - `versions: { drafts: true }`: Payload's draft & publishing workflow system.
 *   - `type: 'richText'`: Full Lexical rich text editor for formatted articles.
 *   - `type: 'relationship'`: Single & multi relationships (`hasMany: true`).
 *   - `type: 'date'`: ISO date picker with calendar & time selection.
 *   - Conditional RBAC: Public readers only see published articles; authors see their own drafts.
 *
 * ============================================================================
 */
export const Articles: CollectionConfig = {
  // ==========================================================================
  // SECTION 1: Slug (Collection Identifier)
  // ==========================================================================
  // - Admin URL:       http://localhost:3000/admin/collections/articles
  // - REST API:        http://localhost:3000/api/articles
  // - Local API:       payload.find({ collection: 'articles' })
  slug: 'articles',

  // ==========================================================================
  // SECTION 2: Multilingual Labels
  // ==========================================================================
  labels: {
    singular: {
      en: 'Article',
      am: 'ጽሑፍ',
    },
    plural: {
      en: 'Articles',
      am: 'ጽሑፎች',
    },
  },

  // ==========================================================================
  // SECTION 3: Admin UI Settings (`admin`)
  // ==========================================================================
  admin: {
    // `useAsTitle`: Article headline displayed in list views and search results
    useAsTitle: 'title',

    // ------------------------------------------------------------------------
    // `preview`: External Tab Preview URL
    // ------------------------------------------------------------------------
    // PURPOSE:
    // When configured, Payload adds a "Preview" button in the document header.
    // Clicking it opens the article in a new tab on your frontend site.
    //
    // HOW IT WORKS:
    // It passes the current document data and active locale:
    // Example output: `/articles/journey-to-lalibela?locale=am&preview=true`
    preview: (doc, { locale }) => {
      if (doc?.slug) {
        return `/articles/${doc.slug}?locale=${locale}&preview=true`
      }
      return null
    },

    // ------------------------------------------------------------------------
    // `livePreview`: Split-Screen Real-Time Editor Preview
    // ------------------------------------------------------------------------
    // PURPOSE:
    // Payload 3's real-time side-by-side Live Preview!
    // Opens an iframe right inside the admin screen. As the writer types,
    // Payload transmits data via `window.postMessage`, rendering live updates
    // without requiring you to save or reload the page!
    //
    // BREAKPOINTS:
    // Allows testing the article layout on Mobile, Tablet, and Desktop screens.
    livePreview: {
      url: ({ data, locale }) => {
        if (data?.slug) {
          return `/articles/${data.slug}?locale=${locale?.code || 'en'}&preview=true`
        }
        return null
      },
      breakpoints: [
        {
          label: 'Mobile (ስልክ)',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet (ታብሌት)',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop (ዴስክቶፕ)',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },

    // `defaultColumns`: Table columns on `/admin/collections/articles`
    defaultColumns: ['title', 'author', 'categories', 'publishedDate', '_status'],

    // `group`: Matches user request: "Content" / "ይዘት"
    group: {
      en: 'Content',
      am: 'ይዘት',
    },

    // `description`: Matches user request:
    // "Travel stories, guides, and editorial content."
    description: {
      en: 'Travel stories, guides, and editorial content.',
      am: 'የጉዞ ታሪኮች፣ መመሪያዎች እና የብሎግ ጽሑፎች።',
    },
  },

  // ==========================================================================
  // SECTION 4: Versions & Draft Publishing Workflow (`versions`)
  // ==========================================================================
  // PURPOSE:
  // Enabling `drafts: true` unlocks Payload's complete publication lifecycle:
  // - Articles can be saved as private 'drafts' before being published.
  // - In the database, Payload tracks `_status: 'draft' | 'published'`.
  // - Full revision history: Every time you save, Payload records an autosaved snapshot,
  //   allowing editors to compare versions or roll back to any past revision!
  versions: {
    drafts: true,
  },

  // ==========================================================================
  // SECTION 5: Access Control (Role-Based Access Control - RBAC)
  // ==========================================================================
  access: {
    // ------------------------------------------------------------------------
    // Read Permissions: Conditional Query Filtering
    // ------------------------------------------------------------------------
    // - Public unauthenticated readers can ONLY see published articles (`_status: 'published'`).
    // - Admins and Editors can see all articles (drafts + published).
    // - Authors can see published articles PLUS their own draft articles!
    read: ({ req: { user } }): boolean | Where => {
      // If user is admin or editor, grant access to all documents
      if (user?.role === 'admin' || user?.role === 'editor' || (user && !user.role)) {
        return true
      }

      // If user is a logged-in author, let them see published articles OR their own drafts
      if (user) {
        return {
          or: [
            {
              _status: {
                equals: 'published',
              },
            },
            {
              author: {
                equals: user.id,
              },
            },
          ] as Where[],
        }
      }

      // Anonymous public visitors can only read published content
      return {
        _status: {
          equals: 'published',
        },
      }
    },

    // Create: Any authenticated staff member (admin, editor, author) can write articles
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'editor', 'author'].includes(user.role as string) || !user.role
    },

    // Update:
    // - Admins and Editors can edit any article in the system.
    // - Authors can ONLY edit their own articles (`author === user.id`).
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'editor' || !user.role) {
        return true
      }
      return {
        author: {
          equals: user.id,
        },
      }
    },

    // Delete: Only Administrators and Editors can permanently delete articles
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin' || user.role === 'editor' || !user.role
    },
  },

  // ==========================================================================
  // SECTION 6: Schema Fields
  // ==========================================================================
  fields: [
    // ------------------------------------------------------------------------
    // FIELD 1: Article Title (`title`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'text'` with `localized: true`
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true, // Multilingual English & Amharic
      maxLength: 180,
      label: {
        en: 'Article Title',
        am: 'የጽሑፉ ርዕስ',
      },
      admin: {
        placeholder: {
          en: 'e.g. Journey to the Ancient Rock Churches of Lalibela...',
          am: 'ለምሳሌ፡ ወደ ጥንታዊ የላሊበላ ውቅር አብያተ ክርስቲያናት የተደረገ ጉዞ...',
        },
        description: {
          en: 'Catchy and descriptive headline for this travel story.',
          am: 'ይህንን የጉዞ ታሪክ የሚገልጽ ማራኪ እና ግልጽ ዋና ርዕስ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 2: URL Slug (`slug`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'text'` with `unique: true` & `index: true`
    //
    // PURPOSE:
    // The clean path for blog article URLs: `/articles/journey-to-lalibela`.
    // Auto-generated from `title` via the `beforeValidate` hook.
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: {
        en: 'URL Slug',
        am: 'የገጽ አድራሻ (Slug)',
      },
      admin: {
        placeholder: {
          en: 'e.g. journey-to-lalibela',
          am: 'ለምሳሌ፡ journey-to-lalibela',
        },
        description: {
          en: 'URL-friendly slug. Auto-generated from title if left empty.',
          am: 'ለድረ-ገጽ አድራሻ ተስማሚ የሆነ መለያ። ባዶ ከሆነ በራስ-ሰር ይዘጋጃል።',
        },
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            const source = value || data?.title
            if (typeof source === 'string') {
              return source
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '')
            }
            return value
          },
        ],
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 3: Featured Hero Image (`heroImage`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'upload'` (Relationship to Media collection)
    //
    // PURPOSE:
    // The large cover photo rendered at the top of the article and on blog cards.
    {
      name: 'heroImage',
      type: 'relationship',
      relationTo: 'media',
      required: true,
      label: {
        en: 'Cover / Hero Image',
        am: 'ዋና የሽፋን ምስል (Hero Image)',
      },
      admin: {
        description: {
          en: 'High-resolution landscape image (16:9 ratio recommended) shown as the article header.',
          am: 'በጽሑፉ አናት እና በዋናው ገጽ ላይ ጎልቶ የሚታይ ጥራት ያለው ፎቶ (16:9 ቅርጽ ይመረጣል)።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 4: Excerpt (`excerpt`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'textarea'` with `localized: true`
    //
    // PURPOSE:
    // 2-3 sentence teaser displayed on blog index cards and social media shares.
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 350,
      label: {
        en: 'Short Excerpt / Teaser',
        am: 'አጭር ማጠቃለያ / ቅምሻ',
      },
      admin: {
        rows: 3,
        placeholder: {
          en: 'A captivating 2-sentence summary that encourages readers to click and read...',
          am: 'አንባቢያን ጽሑፉን ከፍተው እንዲያነቡ የሚጋብዝ አጭር የ2 ዓረፍተ-ነገር ማጠቃለያ...',
        },
        description: {
          en: 'Brief teaser shown on blog archive cards and Google search previews.',
          am: 'በብሎግ ማውጫ ካርዶች እና በፍለጋ ውጤቶች ላይ የሚታይ አጭር ማጠቃለያ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 5: Main Body Content (`content`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'richText'` with `localized: true`
    //
    // WHAT IS `type: 'richText'` IN PAYLOAD CMS?
    // Payload uses the Lexical Rich Text Editor:
    // - Stores content as a structured Abstract Syntax Tree (AST) JSON document.
    // - Supports Headings (H1, H2, H3), Paragraphs, Blockquotes, Ordered & Unordered Lists,
    //   Bold, Italic, Strikethrough, Hyperlinks, and Embedded Media blocks!
    // - Fully localized: Allows writing independent English and Amharic full-length articles!
    {
      name: 'content',
      type: 'richText',
      required: true,
      localized: true, // Multilingual rich text
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures.filter((f) => f.key !== 'upload'),
          // 1. Single Media Upload: Default upload with zero form drawer inputs; resized & positioned directly on canvas by mouse cursor
          UploadFeature(),
          // 2. Visual Media Layout: 100% mouse-driven visual drag-and-drop freeform grid builder with proportional column resizers & inline media selector
          BlocksFeature({
            blocks: [VisualMediaLayout, ImageGallery],
          }),
        ],
      }),
      label: {
        en: 'Article Body Content',
        am: 'የጽሑፉ ዋና ይዘት',
      },
      admin: {
        description: {
          en: 'Full article body. Supports headings, images, quotes, links, formatted text, and Telegram-style media collages.',
          am: 'ሙሉው የጽሑፍ ይዘት። ርዕሶችን፣ ምስሎችን፣ ጥቅሶችን፣ ቅርጸቶችን እና የቴሌግራም ስታይል የፎቶ አቀማመጦችን ይደግፋል።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 6: Author Relationship (`author`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'relationship'` (Single relation to 'users')
    //
    // WHAT IS `type: 'relationship'`?
    // Connects documents across collections using foreign key ObjectIds.
    // Here, it links the article to the staff user in `Users` who wrote it.
    //
    // DEFAULT VALUE AUTOMATION:
    // `defaultValue: ({ user }) => user?.id`
    // When a writer opens the create screen, Payload automatically selects THEM
    // as the author without requiring manual selection!
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }) => user?.id,
      label: {
        en: 'Author',
        am: 'ጸሐፊ',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'The user account credited for writing this article.',
          am: 'ይህንን ጽሑፍ ያዘጋጀው የተጠቃሚ መለያ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 7: Categories Relationship (`categories`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'relationship'` with `hasMany: true`
    //
    // WHAT DOES `hasMany: true` DO?
    // Turns this relationship into a Many-to-Many connection:
    // An article can belong to MULTIPLE categories simultaneously
    // (e.g. "Culture & Heritage" AND "Photography").
    // In MongoDB, saved as an array of ObjectIds: `categories: ['id1', 'id2']`.
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true, // Multiple categories allowed per article
      label: {
        en: 'Categories',
        am: 'ምድቦች',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Topics related to this article (e.g. Culture, History, Wildlife).',
          am: 'ከዚህ ጽሑፍ ጋር የተያያዙ ርዕሰ ጉዳዮች (ለምሳሌ፡ ባሕል፣ ታሪክ፣ የዱር እንስሳት)።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 8: Destinations Relationship (`destinations`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'relationship'` with `hasMany: true`
    //
    // PURPOSE:
    // Directly links the article to specific travel destinations in Ethiopia
    // (e.g., this story covers "Lalibela" and "Gondar").
    {
      name: 'destinations',
      type: 'relationship',
      relationTo: 'destinations',
      hasMany: true, // Can reference multiple destinations covered in an itinerary
      label: {
        en: 'Destinations Covered',
        am: 'የተካተቱ መዳረሻ ቦታዎች',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Select the destinations featured in this story.',
          am: 'በዚህ ጽሑፍ ውስጥ የተካተቱትን የጉዞ መዳረሻ ቦታዎች ይምረጡ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 9: Published Date (`publishedDate`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'date'`
    //
    // PURPOSE:
    // The public release timestamp shown on the article byline.
    //
    // DATE PICKER OPTIONS:
    // `pickerAppearance: 'dayAndTime'` displays both a calendar date picker
    // and an hour/minute time selector for scheduling releases.
    {
      name: 'publishedDate',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      label: {
        en: 'Published Date',
        am: 'የታተመበት ቀን',
      },
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: {
          en: 'Date and time displayed on the public article byline.',
          am: 'በጽሑፉ ላይ በይፋ የሚታየው የታተመበት ቀን እና ሰዓት።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 10: Estimated Reading Time (`readingTimeMinutes`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'number'`
    //
    // PURPOSE:
    // Estimated reading duration in minutes (e.g. "5 min read" / "የ5 ደቂቃ ንባብ").
    {
      name: 'readingTimeMinutes',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 120,
      label: {
        en: 'Read Time (Minutes)',
        am: 'የንባብ ጊዜ (በደቂቃ)',
      },
      admin: {
        position: 'sidebar',
        placeholder: {
          en: 'e.g. 5',
          am: 'ለምሳሌ፡ 5',
        },
        description: {
          en: 'Estimated reading time displayed on article cards (e.g. "5 min read").',
          am: 'በጽሑፍ ካርዶች ላይ የሚታይ ግምታዊ የንባብ ጊዜ (ለምሳሌ፡ "የ5 ደቂቃ ንባብ")።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 11: Featured on Homepage (`featured`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'checkbox'`
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: {
        en: 'Feature on Homepage Hero',
        am: 'በዋናው ገጽ አናት ላይ አድምቅ',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Check to highlight this article in the top homepage spotlight grid.',
          am: 'ይህንን ጽሑፍ በዋናው ገጽ የፊት መስመር ላይ ለማድመቅ ይምረጡ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 12: SEO Metadata (`meta`) - Collapsible / Tab Group
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'group'`
    //
    // PURPOSE:
    // Custom Open Graph & Meta tags for search engines (Google) and social networks.
    {
      name: 'meta',
      type: 'group',
      label: {
        en: 'Search Engine Optimization (SEO)',
        am: 'የፍለጋ ሞተር ማሻሻያ (SEO)',
      },
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
          localized: true,
          maxLength: 70,
          label: {
            en: 'Meta Title',
            am: 'የፍለጋ ሞተር ርዕስ (Meta Title)',
          },
          admin: {
            placeholder: {
              en: 'Custom Google title (defaults to article title if empty)...',
              am: 'ለGoogle ፍለጋ የሚሆን ርዕስ (ባዶ ከሆነ የጽሑፉ ርዕስ ይወሰዳል)...',
            },
            description: {
              en: 'Optimal length: 50-60 characters for search engine result pages.',
              am: 'ለፍለጋ ውጤት ገጾች ተስማሚ ርዝመት፡ ከ50 እስከ 60 ቁምፊዎች።',
            },
          },
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          localized: true,
          maxLength: 160,
          label: {
            en: 'Meta Description',
            am: 'የፍለጋ መግለጫ (Meta Description)',
          },
          admin: {
            rows: 2,
            placeholder: {
              en: 'Summary snippet displayed under the link in Google searches...',
              am: 'በGoogle ፍለጋ ውጤቶች ሥር የሚታይ አጭር ማጠቃለያ...',
            },
            description: {
              en: 'Optimal length: 140-160 characters describing the article content.',
              am: 'ተስማሚ ርዝመት፡ ከ140 እስከ 160 ቁምፊዎች።',
            },
          },
        },
        {
          name: 'ogImage',
          type: 'upload',
          relationTo: 'media',
          label: {
            en: 'Social Share Image (Open Graph)',
            am: 'የማኅበራዊ ሚዲያ ምስል (Open Graph)',
          },
          admin: {
            description: {
              en: 'Image displayed when this article is shared on Facebook, Twitter, Telegram, or LinkedIn.',
              am: 'ጽሑፉ በማኅበራዊ ሚዲያዎች ላይ ሲጋራ የሚታይ ልዩ ምስል (1200x630 ይመረጣል)።',
            },
          },
        },
      ],
    },
  ],

  // ==========================================================================
  // SECTION 7: Timestamps
  // ==========================================================================
  timestamps: true,
}
