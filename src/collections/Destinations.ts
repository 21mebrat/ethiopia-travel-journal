import type { CollectionConfig } from 'payload'
import { BlocksFeature, FixedToolbarFeature, lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'
import { ImageGallery } from '../blocks/ImageGallery'
import { VisualMediaLayout } from '../blocks/VisualMediaLayout'

/**
 * ============================================================================
 * Destinations Collection Configuration - Master Educational Reference Guide
 * ============================================================================
 *
 * 1. WHAT IS A DESTINATIONS COLLECTION?
 * ----------------------------------------------------------------------------
 * Destinations represents geographic locations, national parks, UNESCO World Heritage
 * sites, and cities across Ethiopia (e.g., Lalibela, Gondar, Simien Mountains, Harar).
 *
 * WHY A SEPARATE DESTINATIONS COLLECTION INSTEAD OF JUST TEXT IN ARTICLES?
 *   a) Reusability: Multiple articles can relate to the SAME destination (e.g. 5 articles about Lalibela).
 *   b) Rich Travel Metadata: Each destination stores geographic coordinates, altitude,
 *      best time to visit, region, and dedicated photo galleries.
 *   c) Dedicated Landing Pages: Clean URL routes like `/destinations/simien-mountains`
 *      which display the destination guide alongside all related travel articles.
 *
 * 2. KEY PAYLOAD CMS CONCEPTS TAUGHT IN THIS FILE:
 * ----------------------------------------------------------------------------
 *   - `type: 'array'`: Repeatable lists of objects (used for the photo gallery).
 *   - `type: 'group'`: Nesting fields into a sub-document for clean namespace organization.
 *   - `type: 'number'`: Storing numeric values (altitude, coordinates).
 *   - `type: 'richText'`: Structured Lexical editor for multi-paragraph travel guides.
 *
 * ============================================================================
 */
export const Destinations: CollectionConfig = {
  // ==========================================================================
  // SECTION 1: Slug (Collection Identifier)
  // ==========================================================================
  // - Admin URL:       http://localhost:3000/admin/collections/destinations
  // - REST API:        http://localhost:3000/api/destinations
  // - Local API:       payload.find({ collection: 'destinations' })
  slug: 'destinations',

  // ==========================================================================
  // SECTION 2: Multilingual Labels
  // ==========================================================================
  labels: {
    singular: {
      en: 'Destination',
      am: 'መዳረሻ ቦታ',
    },
    plural: {
      en: 'Destinations',
      am: 'መዳረሻ ቦታዎች',
    },
  },

  // ==========================================================================
  // SECTION 3: Admin UI Settings (`admin`)
  // ==========================================================================
  admin: {
    // `useAsTitle`: Headline displayed in list table, breadcrumbs, and relations
    useAsTitle: 'title',

    // `defaultColumns`: Columns shown in the `/admin/collections/destinations` table
    defaultColumns: ['title', 'region', 'featured', 'updatedAt'],

    // `group`: Matches user request: "Places" / "ቦታዎች"
    group: {
      en: 'Places',
      am: 'ቦታዎች',
    },

    // `description`: Matches user request:
    // "Places such as Lalibela, Gondar, and the Simien Mountains."
    description: {
      en: 'Places such as Lalibela, Gondar, and the Simien Mountains.',
      am: 'እንደ ላሊበላ፣ ጎንደር እና ስሜን ተራሮች ያሉ አስደናቂ ቦታዎች።',
    },
  },

  // ==========================================================================
  // SECTION 4: Access Control (RBAC)
  // ==========================================================================
  access: {
    // Public Read: Any traveler can view destination guides
    read: () => true,

    // Create & Update: Administrators and Editors can add or update destinations
    create: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin' || user.role === 'editor' || !user.role
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin' || user.role === 'editor' || !user.role
    },

    // Delete: Only Administrators can delete destinations to avoid broken links
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
    // FIELD 1: Destination Title (`title`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'text'` with `localized: true`
    //
    // PURPOSE:
    // Localized headline of the destination (e.g. "Rock-Hewn Churches of Lalibela").
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true, // Multilingual English & Amharic
      maxLength: 120,
      label: {
        en: 'Destination Name',
        am: 'የመዳረሻ ቦታው ስም',
      },
      admin: {
        placeholder: {
          en: 'e.g. Simien Mountains National Park, Lalibela, Danakil Depression...',
          am: 'ለምሳሌ፡ የሰሜን ተራሮች ብሔራዊ ፓርክ፣ ላሊበላ፣ ዳሎል (ዳናኪል)...',
        },
        description: {
          en: 'The primary headline of the travel destination.',
          am: 'የጉዞ መዳረሻ ቦታው ዋና መጠሪያ ስም።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 2: URL Slug (`slug`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'text'` with `unique: true` & `index: true`
    //
    // PURPOSE:
    // The clean path component for frontend URLs: `/destinations/simien-mountains`.
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
          en: 'e.g. simien-mountains',
          am: 'ለምሳሌ፡ simien-mountains',
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
    // FIELD 3: Region / State in Ethiopia (`region`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'select'`
    //
    // PURPOSE:
    // Categorizes the destination by Ethiopian geographic region or chartered city.
    {
      name: 'region',
      type: 'select',
      required: true,
      label: {
        en: 'Region / State',
        am: 'ክልል / ከተማ አስተዳደር',
      },
      options: [
        {
          label: {
            en: 'Amhara (Lalibela, Gondar, Bahir Dar, Simien)',
            am: 'አማራ (ላሊበላ፣ ጎንደር፣ ባሕር ዳር፣ ስሜን)',
          },
          value: 'amhara',
        },
        {
          label: {
            en: 'Oromia (Bale Mountains, Wonchi, Bishoftu)',
            am: 'ኦሮሚያ (ባሌ ተራሮች፣ ወንጪ፣ ቢሾፍቱ)',
          },
          value: 'oromia',
        },
        {
          label: {
            en: 'Tigray (Axum, Gheralta, Hawzen)',
            am: 'ትግራይ (አክሱም፣ ገራዕልታ፣ ሐውዜን)',
          },
          value: 'tigray',
        },
        {
          label: {
            en: 'Afar (Danakil Depression, Erta Ale)',
            am: 'አፋር (ዳሎል፣ ኤርታሌ)',
          },
          value: 'afar',
        },
        {
          label: {
            en: 'Sidama (Hawassa, Coffee Plantations)',
            am: 'ሲዳማ (ሐዋሳ፣ የቡና እርሻዎች)',
          },
          value: 'sidama',
        },
        {
          label: {
            en: 'Southern Ethiopia (Omo Valley, Arba Minch)',
            am: 'ደቡብ ኢትዮጵያ (የኦሞ ሸለቆ፣ አርባ ምንጭ)',
          },
          value: 'southern_ethiopia',
        },
        {
          label: {
            en: 'Central Ethiopia (Gurage, Silte, Butajira)',
            am: 'ማዕከላዊ ኢትዮጵያ (ጉራጌ፣ ስልጤ፣ ቡታጅራ)',
          },
          value: 'central_ethiopia',
        },
        {
          label: {
            en: 'South West Ethiopia (Kaffa Coffee Biosphere)',
            am: 'ደቡብ ምዕራብ ኢትዮጵያ (የከፋ የቡና መገኛ)',
          },
          value: 'south_west_ethiopia',
        },
        {
          label: {
            en: 'Benishangul-Gumuz (GERD, Blue Nile)',
            am: 'ቤኒሻንጉል ጉሙዝ (ታላቁ የሕዳሴ ግድብ)',
          },
          value: 'benishangul_gumuz',
        },
        {
          label: {
            en: 'Gambella (Gambella National Park)',
            am: 'ጋምቤላ (ጋምቤላ ብሔራዊ ፓርክ)',
          },
          value: 'gambella',
        },
        {
          label: {
            en: 'Harari (Jugol Walled City)',
            am: 'ሐረሪ (የጀጎል ግንብ ከተማ)',
          },
          value: 'harari',
        },
        {
          label: {
            en: 'Somali (Jigjiga, Babile Elephant Sanctuary)',
            am: 'ሶማሌ (ጅግጅጋ፣ የባቢሌ የዝሆኖች መጠለያ)',
          },
          value: 'somali',
        },
        {
          label: {
            en: 'Addis Ababa (Capital, National Museum, Entoto)',
            am: 'አዲስ አበባ (ዋና ከተማ፣ ብሔራዊ ሙዚየም፣ እንጦጦ)',
          },
          value: 'addis_ababa',
        },
        {
          label: {
            en: 'Dire Dawa (Historic Railway City)',
            am: 'ድሬዳዋ (የምድር ባቡር ከተማ)',
          },
          value: 'dire_dawa',
        },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'Administrative region or chartered city where this destination is located.',
          am: 'ይህ የመዳረሻ ቦታ የሚገኝበት ክልል ወይም የከተማ አስተዳደር።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 4: Featured Destination (`featured`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'checkbox'`
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: {
        en: 'Highlight on Destination Showcase',
        am: 'በዋናው የመዳረሻ ገጽ ላይ አድምቅ',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'When checked, this destination appears in the top hero slider and curated cards.',
          am: 'ከተመረጠ፣ ይህ መዳረሻ በዋናው ገጽ ስላይደር እና በታወቁ ቦታዎች ዝርዝር ውስጥ ጎልቶ ይታያል።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 4B: Destination Category Type (`category`)
    // ------------------------------------------------------------------------
    {
      name: 'category',
      type: 'select',
      defaultValue: 'historic_sites',
      label: {
        en: 'Destination Type',
        am: 'የመዳረሻ ዓይነት',
      },
      options: [
        { label: { en: 'Historic Sites', am: 'ታሪካዊ ቦታዎች' }, value: 'historic_sites' },
        { label: { en: 'Natural Wonders', am: 'የተፈጥሮ ድንቆች' }, value: 'natural_wonders' },
        { label: { en: 'Cities & Towns', am: 'ከተሞች' }, value: 'cities_towns' },
        { label: { en: 'Cultural Experiences', am: 'ባሕላዊ ልምዶች' }, value: 'cultural_experiences' },
        { label: { en: 'Wildlife & Parks', am: 'የዱር እንስሳትና ፓርኮች' }, value: 'wildlife_parks' },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'Primary category used for top filter tabs.',
          am: 'በማጣሪያው ላይ የሚታይ ዋና ምድብ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 4C: Descriptive Tags (`tags`)
    // ------------------------------------------------------------------------
    {
      name: 'tags',
      type: 'text',
      label: {
        en: 'Tags (Comma separated)',
        am: 'መለያዎች (በነጠላ ሰረዝ የተለዩ)',
      },
      admin: {
        placeholder: {
          en: 'e.g. Historic Site, UNESCO Site, Archaeology',
          am: 'ለምሳሌ፡ ታሪካዊ ቦታ፣ የዩኔስኮ ቅርስ',
        },
        description: {
          en: 'Descriptive badges rendered on destination cards.',
          am: 'በመዳረሻ ካርዶች ላይ የሚታዩ መለያዎች።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 5: Main Hero Image (`heroImage`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'upload'`
    //
    // PURPOSE:
    // The high-resolution landscape photograph used for the destination's cover banner.
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: {
        en: 'Hero Banner Image',
        am: 'ዋና የመክፈቻ ምስል (Hero Image)',
      },
      admin: {
        description: {
          en: 'Wide banner photograph (16:9 ratio recommended) shown at the top of the guide.',
          am: 'በገጹ አናት ላይ በስፋት የሚታይ ውብ የመክፈቻ ፎቶ (16:9 ቅርጽ ይመረጣል)።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 6: Destination Overview (`overview`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'textarea'` with `localized: true`
    //
    // PURPOSE:
    // Quick executive summary displayed on preview cards and search results.
    {
      name: 'overview',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 600,
      label: {
        en: 'Overview & Summary',
        am: 'አጠቃላይ እይታ እና ማጠቃለያ',
      },
      admin: {
        rows: 4,
        placeholder: {
          en: 'Summarize what makes this place special (history, landscape, cultural significance)...',
          am: 'ይህን ቦታ ልዩ የሚያደርገውን ነገር በአጭሩ ይግለጹ (ታሪክ፣ መልክዓ ምድር፣ ባሕላዊ እሴት)...',
        },
        description: {
          en: 'Short introductory summary for destination cards and Google search previews.',
          am: 'ለካርዶች እና ለፍለጋ ውጤቶች የሚሆን አጭር ማጠቃለያ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 6B: Destination Guide Full Content (`content`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'richText'` with `localized: true`
    // Optional full editorial body using the configured Lexical editor
    {
      name: 'content',
      type: 'richText',
      required: false,
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures.filter((f) => f.key !== 'upload'),
          UploadFeature(),
          FixedToolbarFeature(),
          BlocksFeature({
            blocks: [VisualMediaLayout, ImageGallery],
          }),
        ],
      }),
      label: {
        en: 'Destination Guide Content',
        am: 'የመዳረሻ መመሪያ ይዘት',
      },
      admin: {
        description: {
          en: 'Comprehensive editorial guide, history, and travel advice for this destination.',
          am: 'ለዚህ መዳረሻ የሚሆን የተሟላ የጉዞ፣ የታሪክ እና የባህል መመሪያ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD 7: Practical Travel Information (`travelInfo`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'group'` (Namespaced Sub-Document)
    //
    // WHAT IS `type: 'group'`?
    // A group nests multiple fields together under a single object key in the database:
    // In MongoDB: `{ travelInfo: { bestTimeToVisit: '...', altitude: 3200, ... } }`.
    //
    // WHY USE A GROUP?
    // - Keeps related data cleanly structured and prevents cluttering the top-level document.
    // - Easy to export or share as a typed object in Next.js frontend code.
    {
      name: 'travelInfo',
      type: 'group',
      label: {
        en: 'Traveler Guide & Practical Info',
        am: 'የተጓዦች መመሪያ እና ጠቃሚ መረጃዎች',
      },
      fields: [
        {
          type: 'row',
          fields: [
            // Subfield 7A: Best Time to Visit
            {
              name: 'bestTimeToVisit',
              type: 'text',
              localized: true,
              label: {
                en: 'Best Time to Visit',
                am: 'ለመጎብኘት አመቺ ወቅት',
              },
              admin: {
                width: '50%',
                placeholder: {
                  en: 'e.g. October to March (Dry Season)',
                  am: 'ለምሳሌ፡ ከጥቅምት እስከ መጋቢት (ደረቅ ወቅት)',
                },
                description: {
                  en: 'Optimal weather window for hiking or sightseeing.',
                  am: 'ለመጎብኘት ወይም ለእግር ጉዞ አመቺ የሆነ የአየር ሁኔታ ወቅት።',
                },
              },
            },

            // Subfield 7B: Altitude in meters
            // FIELD TYPE: `type: 'number'`
            // Stores numeric integers/floats for metric elevation.
            {
              name: 'altitudeMeters',
              type: 'number',
              label: {
                en: 'Altitude (Meters)',
                am: 'ከፍታ (በሜትር)',
              },
              min: -500,
              max: 6000,
              admin: {
                width: '50%',
                placeholder: {
                  en: 'e.g. 2630 (Lalibela) or 4533 (Ras Dashen)',
                  am: 'ለምሳሌ፡ 2630 (ላሊበላ) ወይም 4533 (ራስ ዳሸን)',
                },
                description: {
                  en: 'Elevation in meters above sea level. Important for acclimatization advice.',
                  am: 'ከባህር ጠለል በላይ ያለው ከፍታ በሜትር።',
                },
              },
            },
          ],
        },

        // Subfield 7C: UNESCO World Heritage Status
        {
          name: 'isUnescoSite',
          type: 'checkbox',
          defaultValue: false,
          label: {
            en: 'UNESCO World Heritage Site',
            am: 'የዩኔስኮ የዓለም ቅርስ (UNESCO)',
          },
          admin: {
            description: {
              en: 'Check if this destination is officially registered on the UNESCO World Heritage list.',
              am: 'ይህ ቦታ በይፋ በዩኔስኮ የዓለም ቅርስነት የተመዘገበ ከሆነ ይምረጡ።',
            },
          },
        },
      ],
    },

    // ------------------------------------------------------------------------
    // FIELD 8: Geographic Coordinates (`coordinates`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'group'` with Latitude & Longitude
    //
    // PURPOSE:
    // Enables embedding interactive Leaflet / Mapbox / Google maps on the frontend!
    {
      name: 'coordinates',
      type: 'group',
      label: {
        en: 'Map Coordinates (GPS)',
        am: 'የካርታ መጋጠሚያዎች (GPS)',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'latitude',
              type: 'number',
              label: {
                en: 'Latitude',
                am: 'ላቲቱድ (ኬክሮስ)',
              },
              admin: {
                width: '50%',
                placeholder: {
                  en: 'e.g. 12.0319 (Lalibela)',
                  am: 'ለምሳሌ፡ 12.0319',
                },
              },
            },
            {
              name: 'longitude',
              type: 'number',
              label: {
                en: 'Longitude',
                am: 'ሎንጊቱድ (ኬንትሮስ)',
              },
              admin: {
                width: '50%',
                placeholder: {
                  en: 'e.g. 39.0412 (Lalibela)',
                  am: 'ለምሳሌ፡ 39.0412',
                },
              },
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------------------
    // FIELD 9: Photo Gallery (`gallery`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'array'` (Repeatable List of Objects)
    //
    // WHAT IS `type: 'array'`?
    // One of Payload's most powerful field types! It allows editors to add an unlimited
    // repeatable list of items with their own subfields.
    // In MongoDB, this saves as:
    // `gallery: [ { image: 'id1', caption: '...' }, { image: 'id2', caption: '...' } ]`
    //
    // ALL OPTIONS FOR `type: 'array'`:
    // - `fields`: Subfields repeated in every item (e.g. image, caption, credit).
    // - `minRows`: Minimum required rows (e.g. 1).
    // - `maxRows`: Maximum allowed rows (e.g. 20).
    // - `labels`: Custom row labels shown on each item in the UI:
    //     * `singular`: 'Photo'
    //     * `plural`: 'Photos'
    {
      name: 'gallery',
      type: 'array',
      labels: {
        singular: {
          en: 'Photo',
          am: 'ፎቶ',
        },
        plural: {
          en: 'Photos',
          am: 'ፎቶዎች',
        },
      },
      admin: {
        description: {
          en: 'Curated photo collection showcasing landscapes, monuments, and cultural scenes.',
          am: 'የመዳረሻ ቦታውን ውበት፣ ቅርሶች እና የተፈጥሮ ገጽታዎች የሚያሳዩ የተመረጡ ፎቶዎች።',
        },
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: {
            en: 'Image File',
            am: 'የምስል ፋይል',
          },
        },
        {
          name: 'caption',
          type: 'text',
          localized: true,
          label: {
            en: 'Photo Caption',
            am: 'የፎቶ መግለጫ',
          },
          admin: {
            placeholder: {
              en: 'e.g. Sunset view over the Simien escarpment...',
              am: 'ለምሳሌ፡ የፀሐይ መጥለቂያ ገጽታ በስሜን ተራሮች...',
            },
          },
        },
      ],
    },

    // ------------------------------------------------------------------------
    // FIELD 10: Quick Information Box (`quickInfo`)
    // ------------------------------------------------------------------------
    {
      name: 'quickInfo',
      type: 'group',
      label: {
        en: 'Quick Information Box',
        am: 'ፈጣን መረጃዎች',
      },
      fields: [
        {
          name: 'mainAttractions',
          type: 'text',
          localized: true,
          label: {
            en: 'Main Attractions',
            am: 'ዋና ዋና መስህቦች',
          },
          admin: {
            placeholder: {
              en: 'e.g. Rock-hewn churches, Monasteries, Local culture',
              am: 'ለምሳሌ፡ ውቅር አብያተ ክርስቲያናት፣ ገዳማት',
            },
          },
        },
        {
          name: 'idealFor',
          type: 'text',
          localized: true,
          label: {
            en: 'Ideal For',
            am: 'የሚመች ለ',
          },
          admin: {
            placeholder: {
              en: 'e.g. Culture, History, Spiritual Travel',
              am: 'ለምሳሌ፡ ባሕል፣ ታሪክ፣ መንፈሳዊ ጉዞ',
            },
          },
        },
        {
          name: 'visitDuration',
          type: 'text',
          localized: true,
          label: {
            en: 'Visit Duration',
            am: 'የጉብኝት ቆይታ',
          },
          admin: {
            placeholder: {
              en: 'e.g. 2-3 days',
              am: 'ለምሳሌ፡ 2-3 ቀናት',
            },
          },
        },
      ],
    },

    // ------------------------------------------------------------------------
    // FIELD 11: Top Attractions (`attractions`)
    // ------------------------------------------------------------------------
    {
      name: 'attractions',
      type: 'array',
      labels: {
        singular: { en: 'Attraction', am: 'መስህብ' },
        plural: { en: 'Top Attractions', am: 'ዋና ዋና መስህቦች' },
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          localized: true,
          label: { en: 'Attraction Name', am: 'የመስህቡ ስም' },
        },
        {
          name: 'description',
          type: 'text',
          localized: true,
          label: { en: 'Short Description', am: 'አጭር መግለጫ' },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: { en: 'Attraction Photo', am: 'የመስህቡ ፎቶ' },
        },
      ],
    },

    // ------------------------------------------------------------------------
    // FIELD 12: Recommended Accommodation (`recommendedAccommodation`)
    // ------------------------------------------------------------------------
    {
      name: 'recommendedAccommodation',
      type: 'group',
      label: {
        en: 'Recommended Accommodation',
        am: 'የተመከረ ማረፊያ',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: { en: 'Hotel / Lodge Name', am: 'የሆቴሉ ስም' },
        },
        {
          name: 'rating',
          type: 'number',
          min: 0,
          max: 5,
          label: { en: 'Star Rating', am: 'ኮከብ' },
        },
        {
          name: 'reviewCount',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { en: 'Review Count', am: 'የግምገማዎች ብዛት' },
        },
        {
          name: 'category',
          type: 'text',
          defaultValue: 'Accommodation',
          label: { en: 'Category Badge', am: 'የምድብ መለያ' },
        },
        {
          name: 'description',
          type: 'text',
          localized: true,
          label: { en: 'Description', am: 'መግለጫ' },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: { en: 'Hotel Photo', am: 'የሆቴሉ ፎቶ' },
        },
        {
          name: 'link',
          type: 'text',
          label: { en: 'Booking / Details Link', am: 'የማስያዣ ማስፈንጠሪያ' },
        },
      ],
    },
  ],

  // ==========================================================================
  // SECTION 6: Timestamps
  // ==========================================================================
  timestamps: true,
}
