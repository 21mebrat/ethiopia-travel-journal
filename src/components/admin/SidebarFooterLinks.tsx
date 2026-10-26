import { BookOpen, Globe } from 'lucide-react'

type SidebarFooterLinksProps = {
  i18n?: {
    language?: string
  }
}

export default function SidebarFooterLinks({
  i18n,
}: SidebarFooterLinksProps) {
  const isAmharic = i18n?.language === 'am'

  return (
    <div className="sidebar-footer-links">
      <a
        className="sidebar-footer-links__link"
        href="/"
        rel="noreferrer"
        target="_blank"
      >
        <Globe />
        {isAmharic ? 'ድረ-ገጹን ይመልከቱ' : 'View site'}
      </a>
      <a
        className="sidebar-footer-links__link"
        href="https://payloadcms.com/docs"
        rel="noreferrer"
        target="_blank"
      >
        <BookOpen />
        {isAmharic ? 'ሰነዶች' : 'Documentation'}
      </a>
    </div>
  )
}
