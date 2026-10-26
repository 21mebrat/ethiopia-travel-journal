import {
  Folder,
  Images,
  MapPin,
  Newspaper,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Collection slug → icon. Keeps the custom nav independent from Payload's
 * internal icon set while giving every collection a recognisable mark, just
 * like the icons in the shadcn dashboard-01 sidebar.
 */
const collectionIcons: Record<string, LucideIcon> = {
  articles: Newspaper,
  destinations: MapPin,
  categories: Tags,
  media: Images,
  users: Users,
}

export function getNavIcon(slug: string): LucideIcon {
  return collectionIcons[slug] ?? Folder
}
