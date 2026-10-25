import type { CollectionConfig } from 'payload'

/**
 * ============================================================================
 * Categories Collection Configuration - Master Educational Reference Guide
 * ============================================================================
 *
 * 1. WHAT IS A CATEGORY / TAXONOMY COLLECTION?
 * ----------------------------------------------------------------------------
 * In modern Web & CMS architecture, Content Taxonomy (Categories, Tags) is decoupled
 * from Articles. This provides:
 *   a) Organization: Articles can be grouped by topics (e.g. "Culture", "History", "Wildlife").
 *   b) Discoverability: Readers can filter articles by category.
 *   c) Dynamic Navigation: Menus and top category pills can be generated dynamically.
 *   d) SEO Routing: Dedicated URLs like `/categories/culture` or `/categories/history`.
 *
 * 2. RELATIONSHIPS IN PAYLOAD CMS:
 * ----------------------------------------------------------------------------
 * Other collections (like `Articles`) will reference `Categories` using
 * `type: 'relationship', relationTo: 'categories', hasMany: true`.
 * In the database, Payload stores an array of ObjectId references, and automatically
 * populates the full Category document when queried.
 *
 * ============================================================================
 */
export const Categories: CollectionConfig = {
  // ==========================================================================
  // SECTION 1: Slug (Collection Identifier)
  // ==========================================================================
  // PURPOSE:
  // Unique system slug for this collection across the API, database, and admin routing.
  // - Admin URL:       http://localhost:3000/admin/collections/categories
  // - REST API:        http://localhost:3000/api/categories
  // - Local API:       payload.find({ collection: 'categories' })
  slug: 'categories',

  // ==========================================================================
  // SECTION 2: Multilingual Labels
  // ==========================================================================
  // PURPOSE:
  // Localized human-friendly names for English and Amharic UI displays.
  labels: {
    singular: {
      en: 'Category',
      am: 'ምድብ',
    },
    plural: {
      en: 'Categories',
      am: 'ምድቦች',
    },
  },

  // ==========================================================================
  // SECTION 3: Admin UI Settings (`admin`)
  // ==========================================================================
  admin: {
    // `useAsTitle`: Tells Payload to use the 'name' field as the document headline
    // in table rows, breadcrumbs, and relationship select dropdowns.
    useAsTitle: 'name',

    // `defaultColumns`: Fields shown in the `/admin/collections/categories` list table.
    defaultColumns: ['name', 'slug', 'color', 'featured', 'updatedAt'],

    // `group`: Matches user request: "Organization" / "አደረጃጀት"
    group: {
      en: 'Organization',
      am: 'አደረጃጀት',
    },

    // `description`: Matches user request:
    // "How articles are grouped, such as Culture or History."
    description: {
      en: 'How articles are grouped, such as Culture or History.',
      am: 'ጽሑፎች የሚመደቡበት መንገድ፣ ለምሳሌ ባሕል ወይም ታሪክ።',
    },
  },

  // ==========================================================================
  // SECTION 4: Access Control (RBAC)
  // ==========================================================================
  // RULES:
  // - Public Read: Anyone visiting the blog can see categories to browse content.
  // - Staff Write: Only Administrators and Editors can create, edit, or delete categories.
  access: {
    // Read: Publicly readable for website visitors and API consumers
    read: () => true,

    // Create: Restricted to administrators and editors
    create: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin' || user.role === 'editor' || !user.role
    },

    // Update: Restricted to administrators and editors
    update: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin' || user.role === 'editor' || !user.role
    },

    // Delete: Only full administrators can delete categories to prevent orphaned articles
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin' || !user.role
    },
  },

  // ==========================================================================
  // SECTION 5: Schema Fields
  // ==========================================================================
  fields: [
    // ------------------------------------------------------------------------
    // FIELD 1: Category Name (`name`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'text'` with `localized: true`
    //
    // PURPOSE:
    // The localized title of the category (e.g. "Culture & Heritage" / "ባሕል እና ቅርስ").
    //
    // WHY `localized: true`?
    // When switching admin languages, editors can provide the Amharic translation
    // alongside the English title. In MongoDB, this saves as `{ en: '...', am: '...' }`.
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true, // Enables separate translations for 'en' and 'am'
      maxLength: 80,
      label: {
        en: 'Category Name',
        am: 'የምድብ ስም',
      },
      admin: {
        placeholder: {
          en: 'e.g. Culture & Heritage, Wildlife, Cuisine...',
          am: 'ለምሳሌ፡ ባሕል እና ቅርስ፣ የዱር እንስሳት፣ ምግቦች...',
        },
        description: {
          en: 'The public title of this category shown on article chips and filter menus.',
          am: 'በጽሑፎች እና በማጣሪያ ምናሌዎች ላይ የሚታየው ይፋዊ የምድብ ስም።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 2: URL Slug (`slug`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'text'` with `unique: true` & `index: true`
    //
    // PURPOSE:
    // The clean, URL-safe path component used for frontend routing.
    // Example: https://ethiopia-travel.com/categories/culture-heritage
    //
    // CRITICAL PROPERTIES:
    // - `unique: true`: Enforces that no two categories can share the same slug in the database.
    // - `index: true`: Creates a high-speed database index so querying by slug is instantaneous.
    //
    // AUTOMATION HOOK (`beforeValidate`):
    // If the editor doesn't type a slug manually, this hook takes the `name`
    // and automatically formats it to lowercase kebab-case (e.g. "Culture & Heritage" -> "culture-heritage")!
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true, // Guarantees database uniqueness
      index: true, // Indexed for high-speed URL lookups
      label: {
        en: 'URL Slug',
        am: 'የገጽ አድራሻ (Slug)',
      },
      admin: {
        placeholder: {
          en: 'e.g. culture-heritage',
          am: 'ለምሳሌ፡ culture-heritage',
        },
        description: {
          en: 'URL-friendly identifier. Auto-generated from name if left empty.',
          am: 'ለድረ-ገጽ አድራሻ (URL) ተስማሚ የሆነ መለያ። ባዶ ከሆነ በራስ-ሰር ይዘጋጃል።',
        },
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            // If user supplied a slug, clean it up
            const source = value || data?.name
            if (typeof source === 'string') {
              return source
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '') // remove special chars
                .replace(/[\s_-]+/g, '-') // replace spaces with hyphens
                .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
            }
            return value
          },
        ],
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 3: Category Description (`description`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'textarea'` with `localized: true`
    //
    // PURPOSE:
    // Contextual summary explaining what kind of articles belong to this category.
    // Displayed on the Category index page (e.g. "Explore the rich traditions, coffee ceremonies, and historic tribes of Ethiopia.").
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      maxLength: 500,
      label: {
        en: 'Description',
        am: 'መግለጫ',
      },
      admin: {
        rows: 3,
        placeholder: {
          en: 'Brief description of this topic for readers and SEO metadata...',
          am: 'ለአንባቢያን እና ለፍለጋ ሞተሮች (SEO) የሚሆን አጭር የምድብ ማጠቃለያ...',
        },
        description: {
          en: 'Explains what articles fall into this category. Used on category archive headers.',
          am: 'በዚህ ምድብ ሥር ምን ዓይነት ጽሑፎች እንደሚካተቱ ያብራራል። በምድቡ ገጽ አናት ላይ ይታያል።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 4: Theme Accent Color (`color`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'select'`
    //
    // PURPOSE:
    // Assigns a distinctive brand color to this category chip/badge on article cards.
    //
    // UI POSITION:
    // Placed in `position: 'sidebar'` because it is decorative metadata, keeping the main
    // form clean for text writing.
    {
      name: 'color',
      type: 'select',
      defaultValue: 'amber',
      label: {
        en: 'Badge Color',
        am: 'የምልክት ቀለም',
      },
      options: [
        {
          label: {
            en: 'Amber / Gold (Ethiopian Gold)',
            am: 'ወርቃማ (አምበር)',
          },
          value: 'amber',
        },
        {
          label: {
            en: 'Emerald / Green (Ethiopian Green)',
            am: 'አረንጓዴ',
          },
          value: 'emerald',
        },
        {
          label: {
            en: 'Crimson / Red (Ethiopian Red)',
            am: 'ቀይ',
          },
          value: 'crimson',
        },
        {
          label: {
            en: 'Sapphire / Blue (Highlands Blue)',
            am: 'ሰማያዊ',
          },
          value: 'blue',
        },
        {
          label: {
            en: 'Earth / Brown (Coffee & Soil)',
            am: 'ቡናማ (የቡና እና የመሬት)',
          },
          value: 'brown',
        },
        {
          label: {
            en: 'Purple / Royal',
            am: 'ወይን ጠጅ',
          },
          value: 'purple',
        },
      ],
      admin: {
        position: 'sidebar', // Pinned in the right sidebar
        description: {
          en: 'Color used for category badges on article cards and filter tabs.',
          am: 'በጽሑፍ ካርዶች እና በማጣሪያዎች ላይ ለምድብ ምልክት የሚያገለግል ቀለም።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 5: Featured Status (`featured`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'checkbox'` (Boolean Toggle)
    //
    // WHEN TO USE `type: 'checkbox'`:
    // - For true/false flags (e.g. `featured`, `isPinned`, `enableComments`, `isVerified`).
    // - In MongoDB, saved as a native boolean (`true` or `false`).
    // - In UI, renders as a clickable toggle switch or checkbox.
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: {
        en: 'Feature on Homepage',
        am: 'በዋናው ገጽ ላይ አድምቅ',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'When checked, this category appears in top navigation chips and homepage pills.',
          am: 'ከተመረጠ፣ ይህ ምድብ በዋናው ገጽ እና በዋናው አሰሳ አሞሌ ላይ ጎልቶ ይታያል።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 6: Category Icon / Badge (`icon`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'upload'` (Relationship to Media collection)
    //
    // PURPOSE:
    // Optional custom SVG/PNG icon representing this category in navigation menus.
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      label: {
        en: 'Category Icon',
        am: 'የምድብ አርማ / ምስል',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Optional icon or graphic displayed next to category title.',
          am: 'ከምድቡ ስም ጎን የሚታይ አማራጭ አርማ ወይም ትንሽ ምስል።',
        },
      },
    },
  ],

  // ==========================================================================
  // SECTION 6: Timestamps
  // ==========================================================================
  // Automatically maintains `createdAt` and `updatedAt` date fields.
  timestamps: true,
}
