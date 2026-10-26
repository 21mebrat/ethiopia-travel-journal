import { LayoutDashboard } from 'lucide-react'

type DashboardLinkProps = {
  i18n?: {
    language?: string
  }
  viewType?: string
}

export default function DashboardLink({ i18n, viewType }: DashboardLinkProps) {
  const isAmharic = i18n?.language === 'am'
  const isActive = viewType === 'dashboard'

  return (
    <div className="sidebar-primary-nav">
      <a
        aria-current={isActive ? 'page' : undefined}
        className={`sidebar-primary-nav__link${isActive ? ' is-active' : ''}`}
        href="/admin"
      >
        <LayoutDashboard />
        <span>{isAmharic ? 'ዳሽቦርድ' : 'Dashboard'}</span>
      </a>
    </div>
  )
}
