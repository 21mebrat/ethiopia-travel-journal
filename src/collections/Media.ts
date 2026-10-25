import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: {
      en: 'Media',
      am: 'ሚዲያ',
    },
    plural: {
      en: 'Media',
      am: 'ሚዲያዎች',
    },
  },
  admin: {
    group: {
      en: 'Media & Assets',
      am: 'ሚዲያ እና ፋይሎች',
    },
    description: {
      en: 'Upload and manage blog photos, gallery images, and travel assets.',
      am: 'የብሎግ ፎቶዎችን፣ የጋለሪ ምስሎችን እና የጉዞ ፋይሎችን ይስቀሉ እና ያስተዳድሩ።',
    },
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true, // Enables translation between English & Amharic
      label: {
        en: 'Alt Text',
        am: 'አማራጭ ጽሑፍ (Alt)',
      },
      admin: {
        description: {
          en: 'Important for SEO and screen readers describing the image.',
          am: 'ለምስሉ ገላጭ የሆነ እና ለፍለጋ ሞተሮች (SEO) ጠቃሚ ጽሑፍ።',
        },
      },
    },
    {
      name: 'caption',
      type: 'text',
      localized: true, // Enables translation between English & Amharic
      label: {
        en: 'Caption',
        am: 'መግለጫ (Caption)',
      },
      admin: {
        description: {
          en: 'Optional caption shown beneath the image in blog posts.',
          am: 'በብሎግ ጽሑፎች ውስጥ ከምስሉ ሥር የሚታይ አማራጭ መግለጫ።',
        },
      },
    },
  ],
  upload: true,
}
