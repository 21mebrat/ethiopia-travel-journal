import type { Block } from 'payload'

export const ImageGallery: Block = {
  slug: 'imageGallery',
  labels: {
    singular: {
      en: 'Image Gallery',
      am: 'የምስል ማዕከለ-ስዕላት (Image Gallery)',
    },
    plural: {
      en: 'Image Galleries',
      am: 'የምስል ማዕከለ-ስዕላት',
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      label: {
        en: 'Gallery Title',
        am: 'የማዕከለ-ስዕላት ርዕስ',
      },
    },
    {
      name: 'images',
      type: 'array',
      required: true,
      minRows: 1,
      label: {
        en: 'Gallery Images',
        am: 'የማዕከለ-ስዕላት ምስሎች',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: {
            en: 'Image',
            am: 'ምስል',
          },
        },
        {
          name: 'caption',
          type: 'text',
          localized: true,
          label: {
            en: 'Caption',
            am: 'መግለጫ',
          },
        },
      ],
    },
  ],
}
