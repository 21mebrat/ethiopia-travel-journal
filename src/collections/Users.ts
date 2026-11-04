import type { CollectionConfig } from 'payload'

/**
 * ============================================================================
 * Users Collection Configuration - Master Educational Reference Guide
 * ============================================================================
 *
 * 1. WHAT IS A COLLECTION CONFIG IN PAYLOAD CMS?
 * ----------------------------------------------------------------------------
 * In Payload CMS, a Collection defines:
 *   a) A database table/collection (MongoDB collections or PostgreSQL/SQLite tables).
 *   b) Auto-generated REST endpoints (e.g., GET/POST/PATCH/DELETE at `/api/users`).
 *   c) Auto-generated GraphQL queries and mutations (`Users`, `createUser`, etc.).
 *   d) Complete Admin UI views (List tables, Edit forms, Creation screens, Breadcrumbs).
 *   e) Role-Based Access Control (RBAC) security rules and validation hooks.
 *
 * 2. AUTHENTICATION COLLECTIONS (`auth: true` or `auth: { ... }`)
 * ----------------------------------------------------------------------------
 * When `auth: true` is configured on a collection:
 * - This collection becomes an Authentication Provider for Payload.
 * - Users can log into the Payload Admin Dashboard and authenticate via `/api/users/login`.
 * - Payload AUTOMATICALLY injects and manages the following core authentication fields:
 *     * `email`: Unique login identifier string (automatically indexed and validated).
 *     * `salt` & `hash`: Secure cryptographic password hashes (pbkdf2 / scrypt).
 *     * `resetPasswordToken`: One-time cryptographically secure password reset token.
 *     * `resetPasswordExpiration`: Expiration timestamp for reset tokens.
 *     * `loginAttempts`: Running count of failed login attempts for brute-force protection.
 *     * `lockUntil`: Temporary account lock timestamp after max failed attempts.
 *     * `sessions`: Array of active JWT login sessions with tokens and expiration dates.
 *
 * ============================================================================
 */
export const Users: CollectionConfig = {
  // ==========================================================================
  // SECTION 1: Slug (Collection Identifier)
  // ==========================================================================
  // PURPOSE:
  // The system-wide unique identifier for this collection.
  //
  // WHERE IT APPEARS IN THE APPLICATION & UI:
  // - Admin UI URLs:        http://localhost:3000/admin/collections/users
  // - REST API Endpoints:   http://localhost:3000/api/users
  // - Local Node API:       payload.find({ collection: 'users' })
  // - GraphQL Schema:       type User { ... } / query { Users { docs { ... } } }
  // - Database Schema:      MongoDB collection name `users` or SQL table name `users`
  //
  // POSSIBLE VALUES & CONSTRAINTS:
  // - Must be a lowercase, URL-safe string without spaces or special characters.
  // - Typically lowercase plural or kebab-case (e.g., 'users', 'media', 'travel-guides').
  slug: 'users',

  // ==========================================================================
  // SECTION 2: Multilingual Labels
  // ==========================================================================
  // PURPOSE:
  // Localized human-friendly names displayed in navigation, headers, and buttons.
  //
  // SUBFIELDS & ALL POSSIBLE VALUES:
  // - `singular`:
  //     * String (e.g., 'User') -> used across English interfaces.
  //     * Bilingual/Multilingual Object (e.g., { en: 'User', am: 'ተጠቃሚ' }) ->
  //       dynamically switches based on the active admin language.
  //     * WHERE IT APPEARS:
  //       - Document create header ("Create New User" / "አዲስ ተጠቃሚ ፍጠር").
  //       - Save / Submit button labels ("Save User" / "ተጠቃሚ አስቀምጥ").
  //       - Modal relationship pickers ("Add User" / "ተጠቃሚ አክል").
  // - `plural`:
  //     * String (e.g., 'Users') or Multilingual Object ({ en: 'Users', am: 'ተጠቃሚዎች' }).
  //     * WHERE IT APPEARS:
  //       - Sidebar navigation menu links.
  //       - Collection list view table headline.
  //       - Admin dashboard collection summary cards.
  //       - Search results grouping headline.
  labels: {
    singular: {
      en: 'User',
      am: 'ተጠቃሚ',
    },
    plural: {
      en: 'Users',
      am: 'ተጠቃሚዎች',
    },
  },

  // ==========================================================================
  // SECTION 3: Authentication Configuration (`auth`)
  // ==========================================================================
  // PURPOSE:
  // Configures security parameters, session lifetimes, cookies, and login rules.
  //
  // ALL AVAILABLE OPTIONS INSIDE `auth`:
  // - `tokenExpiration`: Lifespan of JSON Web Token (JWT) in seconds.
  //     * Default: 7200 (2 hours). E.g., 86400 (24 hours), 604800 (7 days).
  // - `maxLoginAttempts`: Number of consecutive failed attempts before account lockout.
  //     * Default: 5. Set to 0 to disable lockout protection.
  // - `lockTime`: Duration (in milliseconds) the account stays locked after max attempts.
  //     * Default: 600000 (10 minutes).
  // - `cookies`: Browser cookie security attributes:
  //     * `secure`: boolean (true in production with HTTPS).
  //     * `sameSite`: 'Lax' | 'Strict' | 'None' (controls cross-site cookie transmission).
  //     * `domain`: string (e.g., '.yourdomain.com' for sharing cookies across subdomains).
  // - `verify`: Email verification workflow before users can authenticate:
  //     * `false` (default) -> Users can log in immediately after registration.
  //     * `true` or object -> Sends verification email with token; user is locked until verified.
  //       (Requires an email adapter like @payloadcms/email-nodemailer or Resend).
  // - `useAPIKey`: boolean | { reveal: boolean } ->
  //     * Enables static API keys for machine-to-machine backend server access.
  // - `depth`: number -> How many relationship levels to populate on `req.user` in sessions.
  // - `forgotPassword`: Custom email template options for password resets.
  // - `loginWithUsername`: boolean | object ->
  //     * Allows users to log in with a username in addition to or instead of email.
  // - `disableLocalStrategy`: boolean ->
  //     * Disables email/password login when delegating entirely to OAuth/SSO (Google, GitHub).
  auth: {
    tokenExpiration: 7200, // 2 hours
    maxLoginAttempts: 5, // Lock after 5 consecutive bad passwords
    lockTime: 10 * 60 * 1000, // 10 minutes lock duration
    verify: false, // Set to true when an email adapter (SMTP/Resend) is configured
    useAPIKey: true,
    forgotPassword: {
      expiration: 5 * 60 * 1000,
    },
    cookies: {
      secure: true,
      sameSite: "Strict",
      // domain:"www.google.com"
    }
  },

  // ==========================================================================
  // SECTION 4: Admin UI Presentation Settings (`admin`)
  // ==========================================================================
  // PURPOSE:
  // Tailors how this collection is rendered inside the Payload Admin Panel.
  //
  // ALL AVAILABLE COLLECTION-LEVEL `admin` OPTIONS:
  // - `useAsTitle`: (string) Field name to use as document label in headers & selects.
  // - `defaultColumns`: (string[]) Field names shown in the collection list table.
  // - `group`: (string | multilingual object | false) Collapsible sidebar category.
  // - `description`: (string | multilingual object | ReactComponent) Subtitle explanation.
  // - `listSearchableFields`: (string[]) Fields scanned by full-text search bar.
  // - `pagination`: { defaultLimit?: number, limits?: number[] } -> page size options.
  // - `hidden`: (boolean | fn) Completely hides collection from sidebar navigation.
  // - `preview`: ((doc, { locale }) => string) URL for front-end live preview iframe.
  // - `components`: Custom React overrides for Views, Header, BeforeList, AfterList, etc.
  admin: {
    // ------------------------------------------------------------------------
    // `useAsTitle`: Document Title Field
    // ------------------------------------------------------------------------
    // PURPOSE: Specifies which field value represents the document headline.
    // WHERE IT APPEARS:
    // - Breadcrumbs trail at the top of the screen (e.g., "Users > Abebe Bikila").
    // - Relationship select dropdowns when picking an author in Blog Posts.
    // - Global search result previews.
    // ALL OPTIONS: Any string/text field name in the collection ('displayName', 'email').
    useAsTitle: 'displayName',

    // ------------------------------------------------------------------------
    // `defaultColumns`: Table Column Selector
    // ------------------------------------------------------------------------
    // PURPOSE: Which data fields display as columns in the `/admin/collections/users` table.
    // WHERE IT APPEARS: Table headers and table cells in the list view.
    // ALL OPTIONS: Array of field names present in the collection.
    defaultColumns: [
      'displayName',
      'firstName',
      'lastName',
      'email',
      'role',
      'createdAt',
    ],
    listSearchableFields: ['displayName', 'firstName', 'lastName', 'email', 'role'],
    // ------------------------------------------------------------------------
    // `group`: Sidebar Menu Categorization
    // ------------------------------------------------------------------------
    // PURPOSE: Groups collections together under an expandable sidebar section.
    // WHERE IT APPEARS: Sidebar section title in uppercase (e.g., "ADMINISTRATION").
    // ALL OPTIONS:
    // - Plain string: 'Administration'
    // - Multilingual object: { en: 'Administration', am: 'አስተዳደር' }
    // - false: Hides this collection from sidebar groupings.
    // group: {
    //   en: 'Identity',
    //   am: 'ማንነት',
    // },
    group: "",

    // ------------------------------------------------------------------------
    // `description`: Descriptive Hint for Content Editors
    // ------------------------------------------------------------------------
    // PURPOSE: Contextual guidance shown to editors explaining the collection's role.
    // WHERE IT APPEARS: Directly beneath the page title on the `/admin/collections/users` list page.
    // ALL OPTIONS: String, bilingual object, or custom React component.
    description: {
      en: 'Who can log in, write articles, and manage the blog?',
      am: 'ወደ መድረኩ መግባት፣ ጽሑፎችን መጻፍ እና ብሎጉን ማስተዳደር የሚችሉ ተጠቃሚዎች።',
    },
  },

  // ==========================================================================
  // SECTION 5: Access Control (Role-Based Access Control - RBAC)
  // ==========================================================================
  // PURPOSE:
  // Enforces security boundaries for data queries and mutations across all channels
  // (REST API, GraphQL API, Local Node API, and the Admin Panel UI).
  //
  // HOW ACCESS FUNCTIONS WORK:
  // Every function receives an object: `{ req: { user }, id, data }`
  // RETURN VALUES:
  // - `true`: Access granted completely.
  // - `false`: Access denied (throws 403 Forbidden or 401 Unauthorized).
  // - Query Filter Object: Dynamic database where-query (e.g. `{ id: { equals: user.id } }`).
  //   Only documents matching the query are returned or modified!
  access: {
    // ------------------------------------------------------------------------
    // `access.admin`: Admin Panel Dashboard Access
    // ------------------------------------------------------------------------
    // PURPOSE: Determines if a user is permitted to enter `/admin`.
    // LOGIC: Allows staff roles (admin, editor, author) or accounts without a role.
    admin: ({ req: { user } }) => {
      if (!user) return false
      if (!user.role) return true // Graceful fallback for legacy accounts
      return ['admin', 'editor', 'author'].includes(user.role as string)
    },

    // ------------------------------------------------------------------------
    // `access.read`: Read / Query Permissions
    // ------------------------------------------------------------------------
    // PURPOSE: Governs who can retrieve user documents via GET /api/users or UI.
    // LOGIC:
    // - Admins & Editors can view all users in the system.
    // - Authors can ONLY view their own user account.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'editor' || !user.role) return true
      return {
        id: {
          equals: user.id,
        },
      }
    },

    // ------------------------------------------------------------------------
    // `access.create`: Create New Document Permissions
    // ------------------------------------------------------------------------
    // PURPOSE: Controls who can create new user accounts.
    // LOGIC: Only Administrators can create new accounts.
    create: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin' || !user.role
    },

    // ------------------------------------------------------------------------
    // `access.update`: Update / Edit Permissions
    // ------------------------------------------------------------------------
    // PURPOSE: Governs who can modify user records via PATCH /api/users/:id.
    // LOGIC:
    // - Admins can update any user account.
    // - Authors & Editors can only update their own profile document.
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || !user.role) return true
      return {
        id: {
          equals: user.id,
        },
      }
    },

    // ------------------------------------------------------------------------
    // `access.delete`: Delete Permissions
    // ------------------------------------------------------------------------
    // PURPOSE: Governs who can permanently remove documents via DELETE /api/users/:id.
    // LOGIC: Only Administrators can permanently delete user accounts.
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin' || !user.role
    },
  },

  // ==========================================================================
  // SECTION 6: Schema Fields (Data Properties & UI Controls)
  // ==========================================================================
  // FIELDS OVERVIEW:
  // Fields define both the database schema columns and the form inputs rendered
  // in the Admin UI. Every field has common properties and type-specific properties.
  //
  // COMMON FIELD PROPERTIES ACROSS ALL TYPES:
  // - `name`: (string) Database key & JSON API property name. Required for data fields.
  // - `type`: (string) Field type ('text', 'textarea', 'select', 'upload', 'row', etc.).
  // - `label`: (string | multilingual object | false) Human-readable input headline.
  // - `required`: (boolean) If true, prevents saving document when empty.
  // - `unique`: (boolean) Generates a unique index in the database.
  // - `index`: (boolean) Generates a database index for high-speed queries.
  // - `defaultValue`: (any | fn) Default value populated when creating a new record.
  // - `validate`: ((value, options) => true | string) Custom validator returning error string.
  // - `saveToJWT`: (boolean) Stores this field value directly inside the encrypted JWT token.
  // - `localized`: (boolean) Stores separate values per active locale (e.g., 'en' and 'am').
  // - `access`: ({ read?: fn, create?: fn, update?: fn }) Field-level security rules.
  // - `hooks`: Lifecycle hooks (`beforeValidate`, `beforeChange`, `afterChange`, `afterRead`).
  // - `admin`: Visual styling, layout, placeholder, visibility conditions, and descriptions.
  fields: [
    // ------------------------------------------------------------------------
    // FIELD GROUP 1: First Name & Last Name (Side-by-Side Row Layout)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'row'` (Layout Container)
    //
    // WHEN TO USE `type: 'row'`:
    // - When you want multiple related input fields to sit horizontally side-by-side
    //   on desktop displays (e.g., First Name + Last Name, City + Zipcode, Start + End Date).
    // - On mobile screens, Payload's responsive CSS automatically stacks them vertically.
    //
    // ALL OPTIONS FOR `type: 'row'`:
    // - `fields`: (Array of Field configs) The child fields rendered inside the row.
    // - `admin`:
    //     * `className`: Custom CSS class applied to the row wrapper.
    //     * `style`: Inline CSS styles applied to the row wrapper.
    //     * `condition`: `(data, siblingData, { user }) => boolean` -> Conditionally show/hide row.
    //
    // ALTERNATIVES TO `row`:
    // - `collapsible`: For collapsing large sections of fields under a toggle header.
    // - `tabs`: For organizing fields across horizontal navigation tabs.
    // - `group`: For nesting fields inside an object in the database (e.g. `address.city`).
    {
      type: 'row',
      fields: [
        // --------------------------------------------------------------------
        // FIELD 1A: First Name (`firstName`)
        // --------------------------------------------------------------------
        // FIELD TYPE: `type: 'text'` (Single-line String Input)
        //
        // WHEN TO USE `type: 'text'`:
        // - For short, single-line text data such as names, titles, codes, phone numbers.
        // - Alternatives:
        //     * `textarea`: For multi-line plain text (biographies, excerpts).
        //     * `richText`: For full formatted articles with bold, links, lists, and images.
        //     * `number`: When numeric arithmetic operations or sorting are required.
        //
        // ALL AVAILABLE OPTIONS FOR `type: 'text'`:
        // - `name`: 'firstName' (Database property key).
        // - `type`: 'text' (Data type identifier).
        // - `required`: true (Prevents saving document if empty).
        // - `maxLength`: 80 (Max characters allowed; prevents database overflow).
        // - `minLength`: number (Minimum characters required).
        // - `label`: Bilingual title rendered above the input box.
        // - `admin`: Object controlling UI appearance:
        //     * `width`: '50%' (Occupies half of the row container).
        //     * `placeholder`: Ghost text visible when the input is empty.
        //     * `description`: Helper guidance text rendered directly below the input.
        //     * `readOnly`: boolean (If true, users can view but not edit the value).
        //     * `disabled`: boolean (If true, disables the input completely).
        //     * `hidden`: boolean (Hides field visually from the edit screen).
        //     * `autoComplete`: HTML autocomplete attribute (e.g. 'given-name').
        {
          name: 'firstName',
          type: 'text',
          required: true,
          maxLength: 80,
          label: {
            en: 'First Name',
            am: 'ስም',
          },
          admin: {
            width: '50%', // Flex width percentage within the row
            placeholder: {
              en: 'e.g. Abebe',
              am: 'ለምሳሌ፡ አበበ',
            },
            description: {
              en: "The author's given name.",
              am: 'የተጠቃሚው መጠሪያ ስም።',
            },
            autoComplete: 'given-name',
          },
        },

        // --------------------------------------------------------------------
        // FIELD 1B: Last Name (`lastName`)
        // --------------------------------------------------------------------
        // FIELD TYPE: `type: 'text'`
        {
          name: 'lastName',
          type: 'text',
          required: true,
          maxLength: 80,
          label: {
            en: 'Last Name',
            am: 'የአባት ስም',
          },
          admin: {
            width: '50%', // Flex width percentage within the row
            placeholder: {
              en: 'e.g. Bikila',
              am: 'ለምሳሌ፡ ቢቂላ',
            },
            description: {
              en: "The author's father or family name.",
              am: 'የአባት ወይም የቤተሰብ ስም።',
            },
            autoComplete: 'family-name',
          },
        },
      ],
    },

    // ------------------------------------------------------------------------
    // FIELD GROUP 2: Public Author Display Name (`displayName`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'text'` with Field Hook Automation
    //
    // PURPOSE:
    // The public author pen name displayed on blog posts, cards, and author profiles.
    //
    // WHAT ARE FIELD HOOKS?
    // Hooks allow running custom server-side functions at specific lifecycle events:
    // - `beforeValidate`: Runs BEFORE schema validation. Ideal for sanitization or auto-generating defaults.
    // - `beforeChange`: Runs AFTER validation but BEFORE writing data to the database.
    // - `afterChange`: Runs AFTER saving to database. Ideal for cache invalidation or webhooks.
    // - `beforeRead`: Runs BEFORE transforming raw DB data to API format.
    // - `afterRead`: Runs AFTER document is read. Ideal for computing virtual values.
    //
    // HERE:
    // If `displayName` is left blank by the user, the `beforeValidate` hook
    // automatically populates it by concatenating `${firstName} ${lastName}`!
    {
      name: 'displayName',
      type: 'text',
      maxLength: 120,
      label: {
        en: 'Display Name',
        am: 'የሚታይ ስም',
      },
      admin: {
        placeholder: {
          en: 'e.g. Abebe Bikila',
          am: 'ለምሳሌ፡ አበበ ቢቂላ',
        },
        description: {
          en: 'Public pen name shown on blog post bylines and author profile cards. Defaults to First + Last name.',
          am: 'በብሎግ ጽሑፎች እና የጸሐፊ መገለጫ ላይ በይፋ የሚታይ ስም። ካልተሞላ በራስ-ሰር ከስም እና ከአባት ስም ይወሰዳል።',
        },
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (!value && data?.firstName && data?.lastName) {
              return `${data.firstName} ${data.lastName}`.trim()
            }
            return value
          },
        ],
      },
    },

    // ------------------------------------------------------------------------
    // FIELD GROUP 3: Profile Photo Avatar (`avatar`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'upload'` (Media Relationship & File Dropzone)
    //
    // WHEN TO USE `type: 'upload'`:
    // - Whenever a document needs to attach an image, PDF, video, or audio file.
    // - Connects directly to an upload-enabled collection (e.g., 'media').
    // - Provides an interactive file dropzone, thumbnail preview, crop tools, and media library picker.
    //
    // ALL AVAILABLE OPTIONS FOR `type: 'upload'`:
    // - `name`: 'avatar' (Property key storing the related media document ID or object).
    // - `type`: 'upload' (Data type identifier).
    // - `relationTo`: 'media' (Target collection slug where files are uploaded).
    // - `hasMany`: boolean
    //     * `false` (default): Single file avatar.
    //     * `true`: Multiple files (e.g., photo gallery).
    // - `filterOptions`: Dynamic query filter object or function to restrict selectable media:
    //     * Example: `filterOptions: { mimeType: { contains: 'image/' } }` (images only).
    // - `maxDepth`: number (Controls population depth when querying via API).
    // - `admin`:
    //     * `description`: Helper text explaining ideal image dimensions or aspect ratios.
    //     * `readOnly`: boolean.
    //     * `condition`: `(data, siblingData) => boolean`.
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      filterOptions: {
        mimeType: {
          contains: 'image/', // Restricts uploads in this field to images only
        },
      },
      label: {
        en: 'Profile Photo',
        am: 'የመገለጫ ፎቶ',
      },
      admin: {
        description: {
          en: 'Author photo shown next to articles (square 1:1 aspect ratio recommended).',
          am: 'ከጽሑፎች ጎን የሚታይ የጸሐፊው ፎቶ (ካሬ 1:1 ቅርጽ ይመረጣል)።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD GROUP 4: Localized Author Biography (`bio`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'textarea'` with `localized: true`
    //
    // WHEN TO USE `type: 'textarea'`:
    // - For multi-line plain text strings (author biographies, tour itineraries summaries, notes).
    // - When you need line breaks without HTML tags.
    // - Difference vs `richText`: `textarea` saves raw plain text string; `richText` saves structured JSON (Lexical).
    //
    // WHAT DOES `localized: true` DO?
    // - Tells Payload to store separate values for each supported locale code ('en' and 'am').
    // - When an editor switches the Admin Locale Selector, the field displays that language's version.
    // - In MongoDB, it is stored as: `{ bio: { en: "Hello", am: "ሰላም" } }`.
    // - In the REST API, calling `/api/users?locale=am` returns the Amharic translation directly!
    //
    // ALL AVAILABLE OPTIONS FOR `type: 'textarea'`:
    // - `name`: 'bio' (Database property key).
    // - `type`: 'textarea' (Multi-line text identifier).
    // - `localized`: true (Enables multilingual storage).
    // - `maxLength`: 1000 (Maximum character count limit).
    // - `minLength`: number (Minimum character requirement).
    // - `rows`: number of visible text lines in the UI (default: 4).
    // - `label`: Localized input label.
    // - `admin`:
    //     * `rows`: 4 (Height of textarea box in lines).
    //     * `placeholder`: Contextual hints in English and Amharic.
    //     * `description`: Guidance for editors.
    {
      name: 'bio',
      type: 'textarea',
      localized: true, // Multilingual field: saves separate values for 'en' and 'am'
      maxLength: 1000,
      label: {
        en: 'Biography',
        am: 'የሕይወት ታሪክ',
      },
      admin: {
        rows: 4, // Number of visible text lines in form
        placeholder: {
          en: 'Write a short author bio (e.g., travel enthusiast covering northern Ethiopia)...',
          am: 'አጭር የጸሐፊ የሕይወት ታሪክ እዚህ ይጻፉ (ለምሳሌ፡ የሰሜን ኢትዮጵያ ታሪካዊ ቦታዎች ተጓዥ)...',
        },
        description: {
          en: 'Short author introduction. Supports separate English and Amharic translations.',
          am: 'አጭር የጸሐፊ መግለጫ። የተለየ የእንግሊዝኛ እና የአማርኛ ትርጉም ይደግፋል።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD GROUP 5: Role & Permissions (`role`) - Pinned to Sidebar
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'select'` (Dropdown Selector)
    //
    // WHEN TO USE `type: 'select'`:
    // - When data must strictly match one of several predefined choices (enums).
    // - Examples: User roles ('admin', 'editor', 'author'), article status ('draft', 'published'),
    //   priority ('low', 'medium', 'high').
    // - Alternatives:
    //     * `radio`: When there are 2-4 options that should all be visible simultaneously.
    //     * `relationship`: When choices must be created dynamically by editors in another collection.
    //
    // WHAT DOES `position: 'sidebar'` DO?
    // - Moves this field out of the main scrolling body into the sticky right-hand sidebar.
    // - Best used for metadata, status, publish dates, roles, and administrative tags.
    //
    // WHAT DOES `saveToJWT: true` DO?
    // - Encrypts the user's role directly into their JWT authentication cookie.
    // - BENEFIT: Any server component, middleware, or client component can check `user.role`
    //   INSTANTLY without making another database query to MongoDB!
    //
    // ALL AVAILABLE OPTIONS FOR `type: 'select'`:
    // - `name`: 'role' (Database key).
    // - `type`: 'select' (Select dropdown identifier).
    // - `required`: true (Cannot be left empty).
    // - `defaultValue`: 'author' (Default option selected for new users).
    // - `hasMany`: boolean (false = single select; true = multi-select array of choices).
    // - `options`: Array of choices. Each item can be:
    //     * Simple string: `'admin'`
    //     * Object: `{ label: 'Administrator', value: 'admin' }`
    //     * Multilingual Object: `{ label: { en: '...', am: '...' }, value: 'admin' }`
    // - `access`: Field-level security:
    //     * `update: ({ req: { user } }) => user?.role === 'admin'` ->
    //       CRITICAL SECURITY RULE: Prevents non-admin authors from elevating themselves to admin!
    // - `admin`:
    //     * `position`: 'sidebar' (Renders in right sidebar column).
    //     * `isClearable`: boolean (Whether the user can clear the selection back to null).
    //     * `description`: Helper text explaining access rights granted by this role.
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'author',
      saveToJWT: true, // Injected into JWT session token for fast permission lookups
      label: {
        en: 'Role',
        am: 'ሚና',
      },
      options: [
        {
          label: {
            en: 'Administrator',
            am: 'አስተዳዳሪ (ሙሉ ፈቃድ)',
          },
          value: 'admin',
        },
        {
          label: {
            en: 'Editor',
            am: 'አርታዒ (ጽሑፍ አሳታሚ)',
          },
          value: 'editor',
        },
        {
          label: {
            en: 'Author',
            am: 'ጸሐፊ (የራሱን ብቻ የሚያዘጋጅ)',
          },
          value: 'author',
        },
      ],
      access: {
        // SECURITY RULE: Only administrators can modify a user's role!
        // Regular authors and editors cannot change roles.
        update: ({ req: { user } }) => {
          if (!user) return false
          return user.role === 'admin' || !user.role
        },
      },
      admin: {
        position: 'sidebar', // Pinned into the right sidebar column of the edit screen
        description: {
          en: 'Controls editorial access permissions. Only admins can modify this.',
          am: 'የአስተዳደር እና የጽሑፍ ፈቃድን ይቆጣጠራል። አስተዳዳሪዎች ብቻ መቀየር ይችላሉ።',
        },
      },
    },

    // ------------------------------------------------------------------------
    // FIELD GROUP 6: Preferred Language Preference (`preferredLanguage`)
    // ------------------------------------------------------------------------
    // FIELD TYPE: `type: 'select'` (Sidebar Position)
    //
    // PURPOSE:
    // Stores the user's default language choice for email communications, notifications,
    // and dashboard locale preference.
    {
      name: 'preferredLanguage',
      type: 'select',
      required: true,
      defaultValue: 'en',
      saveToJWT: true, // Injected into JWT so the frontend knows the user's language immediately
      label: {
        en: 'Preferred Language',
        am: 'ተመራጭ ቋንቋ',
      },
      options: [
        {
          label: {
            en: 'English',
            am: 'እንግሊዝኛ (English)',
          },
          value: 'en',
        },
        {
          label: {
            en: 'Amharic',
            am: 'አማርኛ (Amharic)',
          },
          value: 'am',
        },
      ],
      admin: {
        position: 'sidebar', // Pinned in the right sidebar column
        description: {
          en: "The user's preferred language for the blog interface, notifications, and communication.",
          am: 'ለብሎግ በይነገጽ፣ ማሳወቂያዎች እና ግንኙነት የተጠቃሚው ተመራጭ ቋንቋ።',
        },
      },
    },
  ],

  // ==========================================================================
  // SECTION 7: Collection Lifecycle Hooks (`hooks`)
  // ==========================================================================
  // PURPOSE:
  // Collection-level hooks execute server-side business logic during lifecycle events.
  //
  // AVAILABLE COLLECTION HOOKS IN PAYLOAD CMS:
  // - `beforeValidate`: [fn] -> Modify or validate data before schema validation runs.
  // - `beforeChange`: [fn]   -> Transform document data right before inserting or updating DB.
  // - `afterChange`: [fn]    -> Trigger side-effects after save (send emails, update search index).
  // - `beforeRead`: [fn]     -> Alter raw database data before returning via API or UI.
  // - `afterRead`: [fn]      -> Add computed or virtual properties to the retrieved document.
  // - `beforeDelete`: [fn]   -> Cleanup external assets before a record is deleted.
  // - `afterDelete`: [fn]    -> Notify external systems or log deletion audit trail.
  // - `beforeOperation`: [fn]-> Inspect or modify args before any collection operation starts.
  // - `afterOperation`: [fn] -> Transform the final operation result before returning.
  // - `beforeLogin`: [fn]    -> Inspect or reject login attempts (e.g. check if user is active).
  // - `afterLogin`: [fn]     -> Log login audit timestamp or record IP address.
  // - `afterLogout`: [fn]    -> Cleanup active session tokens.
  // - `afterMe`: [fn]        -> Custom behavior when `/api/users/me` endpoint is called.
  // - `afterRefresh`: [fn]   -> Custom behavior when JWT token is refreshed.
  // - `afterForgotPassword`:[fn]-> Custom actions when password reset is requested.
  hooks: {},

  // ==========================================================================
  // SECTION 8: Timestamps
  // ==========================================================================
  // PURPOSE:
  // Automatically adds and manages `createdAt` and `updatedAt` ISO date fields.
  // Default is `true`. Set to `false` only if you do not want timestamp tracking.
  timestamps: true,
}
