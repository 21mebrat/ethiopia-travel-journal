import type { CollectionConfig } from "payload"

export const Advertisements: CollectionConfig = {
    slug: "title",
    labels: {
        singular: {
            am: "ማስታወቂያ", en: "Advertisement"
        },
        plural: {
            am: "ማስታወቂያዎች", en: "Advertisements"
        }
    },
    access: {
        create: ({ req: { user } }) => {
            return user?.role === "admin" || user?.role === "editor"
        },
        update: ({ req: { user } }) => {
            return user?.role === "admin" || user?.role === "editor"
        },
        delete: ({ req: { user } }) => {
            return user?.role === "admin" || user?.role === "editor"
        },
        read: () => true
    },
    admin: {
        useAsTitle: "title",
        preview: (doc, { locale }) => {
            if (doc?.slug)
                return `/advertisement/${doc.slug}?locale=${locale || 'en'}&preview=true`
            return null
        },
        livePreview: {
            url: ({ data, locale }) => {
                if (data?.slug)
                    return `/advertisement/${data.slug}?locale=${locale?.code || 'en'}&preview=true`
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
        defaultColumns: ["heroImage", "title", "status", "createdAt"],
        listSearchableFields: ["title", "status"]
    },
    fields: [
        {
            name: "title",
            type: "text",
            localized: true,
            required: true,
            unique: true,
            label: {
                en: "Title",
                am: "ርዕስ"
            },
            admin: {
                description: {
                    am: "የማስታወቂያው ርዕስ",
                    en: "Title of the advertisement"
                },
                placeholder: {
                    en: "Enter title",
                    am: "ርዕስ ያስገቡ"
                }
            }
        },
        {
            name: "content",
            type: "richText",
            localized: true,
            label: {
                en: "Content",
                am: "ይዘት"
            },
            admin: {
                description: {
                    am: "የማስታወቂያው ይዘት",
                    en: "Content of the advertisement"
                },
            }
        },
        {
            name: "slug",
            type: "text",
            required: true,
            localized: true,
            index: true,
            admin: {
                description: {
                    en: "URL friendly version of the title",
                    am: "የርዕሱ የURL አይነት",
                },
                placeholder: {
                    en: "Enter slug",
                    am: "ስለቱ ያስገቡ",
                }
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
        {
            name: "heroImage",
            type: "relationship",
            relationTo: "media",
            hasMany: false,
            label: {
                en: "Hero Image",
                am: "ዋናው ምስል"
            },
            admin: {
                description: {
                    am: "የማስታወቂያው ሚዲያ",
                    en: "Media of the advertisement"
                }
            }
        }
    ]
}