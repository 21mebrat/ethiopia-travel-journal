'use client'

import React, { useEffect, useState } from 'react'
import { useAuth, useTheme, useTranslation, useLocale } from '@payloadcms/ui'

export default function LogoutButton() {
  const { user, logOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { i18n } = useTranslation()
  const locale = useLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? theme === 'dark' : true

  // Current language determination (checks i18n language or locale code)
  const isAmharic = mounted ? (i18n?.language === 'am' || locale?.code === 'am') : false

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        padding: '2px 0',
      }}
    >
      {/* User Info (when signed in) */}
      {user?.email && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '6px',
            background: 'var(--theme-elevation-100, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--theme-elevation-150, rgba(255, 255, 255, 0.06))',
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--theme-elevation-200, #334155)',
              color: 'var(--theme-elevation-800, #f8fafc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {user.email.charAt(0)}
          </div>
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '12px',
              color: 'var(--theme-elevation-700, #94a3b8)',
            }}
            title={user.email}
          >
            {user.email}
          </div>
        </div>
      )}

      {/* Row 1: Theme Switcher & Language Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
        }}
      >
        {/* Theme Switcher Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid var(--theme-elevation-150, rgba(255, 255, 255, 0.08))',
            background: 'var(--theme-elevation-50, transparent)',
            color: 'var(--theme-elevation-700, #94a3b8)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--theme-elevation-100, rgba(255, 255, 255, 0.06))'
            e.currentTarget.style.color = 'var(--theme-elevation-900, #f8fafc)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--theme-elevation-50, transparent)'
            e.currentTarget.style.color = 'var(--theme-elevation-700, #94a3b8)'
          }}
        >
          {isDark ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
          <span>{isDark ? (isAmharic ? 'ጨለማ' : 'Dark') : (isAmharic ? 'ብርሃን' : 'Light')}</span>
        </button>
      </div>

      {/* Row 2: Log Out Button */}
      <button
        type="button"
        onClick={() => {
          void logOut()
        }}
        aria-label="Log out"
        title="Log out of admin"
        style={{
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '32px',
          padding: '0 8px',
          borderRadius: '6px',
          border: '1px solid var(--theme-elevation-150, rgba(255, 255, 255, 0.08))',
          background: 'var(--theme-elevation-50, transparent)',
          color: 'var(--theme-elevation-700, #94a3b8)',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
          e.currentTarget.style.color = '#ef4444'
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--theme-elevation-50, transparent)'
          e.currentTarget.style.color = 'var(--theme-elevation-700, #94a3b8)'
          e.currentTarget.style.borderColor = 'var(--theme-elevation-150, rgba(255, 255, 255, 0.08))'
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>{isAmharic ? 'ውጣ' : 'Log out'}</span>
      </button>
    </div>
  )
}
