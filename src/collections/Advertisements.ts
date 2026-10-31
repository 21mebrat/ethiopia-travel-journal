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
        },
        {
            name: "status",
            type: "select",
            required: true,
            defaultValue: "active",
            options: [
                { label: { en: "Active", am: "ንቁ" }, value: "active" },
                { label: { en: "Inactive", am: "ቦዝኗል" }, value: "inactive" },
            ],
            label: {
                en: "Status",
                am: "ሁኔታ"
            },
            admin: {
                position: "sidebar",
                description: {
                    en: "Controls whether this advertisement is eligible for display.",
                    am: "ይህ ማስታወቂያ እንዲታይ ወይም እንዳይታይ ይቆጣጠራል።"
                }
            }
        },
        {
            name: "placement",
            type: "select",
            defaultValue: "all",
            options: [
                { label: { en: "All Placements", am: "ሁሉም ቦታዎች" }, value: "all" },
                { label: { en: "Destination Listing", am: "የመዳረሻዎች ዝርዝር ገጽ" }, value: "destination_listing" },
                { label: { en: "Destination Detail", am: "የመዳረሻ ዝርዝር መረጃ ገጽ" }, value: "destination_detail" },
                { label: { en: "Stories Feed / Sidebar", am: "የታሪኮች ገጽ" }, value: "stories" },
                { label: { en: "General", am: "አጠቃላይ" }, value: "general" },
            ],
            label: {
                en: "Target Placement",
                am: "የሚታይበት ክፍል"
            },
            admin: {
                position: "sidebar",
                description: {
                    en: "Where this advertisement should be rendered across the site.",
                    am: "ይህ ማስታወቂያ በድረ-ገጹ ላይ የት እንደሚታይ ይወስናል።"
                }
            }
        },
        {
            name: "variant",
            type: "select",
            defaultValue: "standard",
            options: [
                { label: { en: "Standard Editorial Card", am: "መደበኛ የማስታወቂያ ካርድ" }, value: "standard" },
                { label: { en: "Luxury Lodge / Curated Stay", am: "ሎጅ / የቅንጦት ማረፊያ" }, value: "lodge" },
                { label: { en: "Airline Network Partner", am: "የአየር መንገድ አጋር" }, value: "airline" },
            ],
            label: {
                en: "Presentation Variant",
                am: "የአቀራረብ አይነት"
            },
            admin: {
                position: "sidebar",
                description: {
                    en: "Design layout used to render this advertisement.",
                    am: "ይህ ማስታወቂያ የሚታይበት የዲዛይን ቅርጽ።"
                }
            }
        },
        {
            name: "ctaText",
            type: "text",
            localized: true,
            label: {
                en: "CTA Button Text",
                am: "የአዝራር ጽሑፍ"
            },
            admin: {
                placeholder: {
                    en: "e.g. Explore Lodges, Book Flight, Learn More",
                    am: "ለምሳሌ፡ ሎጆችን ያስሱ፣ በረራ ያስይዙ፣ ተጨማሪ ይመልከቱ"
                },
                description: {
                    en: "Action label for the link button (defaults to 'Learn More' / 'ይመልከቱ').",
                    am: "በአዝራሩ ላይ የሚታይ ጽሑፍ።"
                }
            }
        },
        {
            name: "ctaLink",
            type: "text",
            label: {
                en: "CTA Destination URL",
                am: "የመድረሻ አድራሻ (URL)"
            },
            admin: {
                placeholder: {
                    en: "e.g. https://example.com or /destinations?category=...",
                    am: "ለምሳሌ፡ https://example.com ወይም /destinations?category=..."
                },
                description: {
                    en: "Target URL when the user clicks the ad button.",
                    am: "ተጠቃሚው አዝራሩን ሲጫን የሚከፈት የድረ-ገጽ አድራሻ።"
                }
            }
        },
        {
            name: "sponsorLabel",
            type: "text",
            localized: true,
            label: {
                en: "Sponsor / Badge Label",
                am: "የስፖንሰር መለያ ጽሑፍ"
            },
            admin: {
                placeholder: {
                    en: "e.g. SPONSORED, PARTNER, AD",
                    am: "ለምሳሌ፡ ስፖንሰር የተደረገ፣ አጋር፣ ማስታወቂያ"
                },
                description: {
                    en: "Badge text overlaid on the card (defaults to 'SPONSORED' / 'ስፖንሰር የተደረገ').",
                    am: "በካርዱ ላይ የሚታይ የስፖንሰር መለያ።"
                }
            }
        },
        {
            name: "durationValue",
            type: "number",
            defaultValue: 10,
            min: 1,
            label: {
                en: "Display Duration Value",
                am: "የቆይታ ጊዜ መጠን"
            },
            admin: {
                description: {
                    en: "How long this advertisement remains visible before rotating to the next ad. (Default: 10).",
                    am: "ወደ ቀጣዩ ማስታወቂያ ከመዞሩ በፊት የሚቆይበት የጊዜ መጠን (ነባሪ፡ 10)።"
                }
            }
        },
        {
            name: "durationUnit",
            type: "select",
            defaultValue: "seconds",
            options: [
                { label: { en: "Seconds (ሰከንዶች)", am: "ሰከንዶች" }, value: "seconds" },
                { label: { en: "Minutes (ደቂቃዎች)", am: "ደቂቃዎች" }, value: "minutes" },
                { label: { en: "Hours (ሰዓታት)", am: "ሰዓታት" }, value: "hours" },
                { label: { en: "Days (ቀናት)", am: "ቀናት" }, value: "days" },
            ],
            label: {
                en: "Display Duration Unit",
                am: "የቆይታ ጊዜ መለኪያ"
            },
            admin: {
                description: {
                    en: "Time unit for display duration (seconds, minutes, hours, days).",
                    am: "የቆይታ ጊዜ መለኪያ (ሰከንዶች፣ ደቂቃዎች፣ ሰዓታት፣ ቀናት)።"
                }
            }
        },
        {
            name: "startDate",
            type: "date",
            label: {
                en: "Campaign Start Date",
                am: "የዘመቻ መጀመሪያ ቀን"
            },
            admin: {
                position: "sidebar",
                description: {
                    en: "Optional start date. Ad is inactive before this date.",
                    am: "አማራጭ የመጀመሪያ ቀን። ከዚህ ቀን በፊት አይታይም።"
                }
            }
        },
        {
            name: "endDate",
            type: "date",
            label: {
                en: "Campaign End Date",
                am: "የዘመቻ ማብቂያ ቀን"
            },
            admin: {
                position: "sidebar",
                description: {
                    en: "Optional expiration date. Ad is inactive after this date.",
                    am: "አማራጭ የማብቂያ ቀን። ከዚህ ቀን በኋላ አይታይም።"
                }
            }
        }
    ]
}