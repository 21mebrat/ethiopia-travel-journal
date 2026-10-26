import type { CollectionConfig } from "payload"

export const Comments: CollectionConfig = {
    slug: "comments",
    labels: {
        singular: {
            en: "Comment",
            am: "",
        },
        plural: {
            en: "Comments",
            am: "",
        },
    },
    admin: {
        useAsTitle: "body",
        defaultColumns: ['full_name', "email", "phone", "body", "createdAt"],
        description: {
            en: 'Manage comments from users',
            am: 'የተጠቃሚዎች አስተያየቶችን ያስተዳድሩ'
        },
        listSearchableFields: ['full_name', "email", "phone", "body"],
    },
    access: {
        read: () => true,
        create: () => true,
        update: () => false,
        delete: ({ req: { user } }) => {
            if (!user) return false
            if (user.role == "admin") return true
            return false
        }

    },
    fields: [
        {
            name: "full_name",
            type: "text",
            localized: true,
            label: {
                en: "Full Name",
                am: "ሙሉ ስም"
            },
        },
        {
            name: "email",
            type: "email",
            localized: true,
            label: {
                en: "Email",
                am: ""
            }
        },
        {
            name: "phone",
            type: "text",
            localized: true,
            label: {
                en: "Phone",
                am: ""
            }
        },
        {
            name: 'body',
            type: "richText",
            required: true,
            localized: true,
            label: {
                en: "Comment",
                am: "አስተያየት"
            }

        }
    ]

}