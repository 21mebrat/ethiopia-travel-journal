import { Plus } from 'lucide-react'

type SidebarBrandProps = {
  i18n?: {
    language?: string
  }
}

export default function SidebarBrand({ i18n }: SidebarBrandProps) {
  const isAmharic = i18n?.language === 'am'

  return (
    <div className="sidebar-brand">
      <a className="sidebar-brand__link" href="/admin">
        <span className="sidebar-brand__mark">
          <img alt="Ethiopia Tour Blog" src="/assets/ethiopia-tour-icon.png" />
        </span>
        <span className="sidebar-brand__name">
          <strong>Ethiopia Tour Blog</strong>
          <span>{isAmharic ? 'የአርታዒ ስቱዲዮ' : 'Editorial Studio'}</span>
        </span>
      </a>

      <a
        className="sidebar-brand__create"
        href="/admin/collections/articles/create"
      >
        <Plus />
        {isAmharic ? 'አዲስ ጽሑፍ' : 'New article'}
      </a>
    </div>
  )
}
