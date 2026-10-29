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
        defaultColumns: ["title", "status", "createdAt"],
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