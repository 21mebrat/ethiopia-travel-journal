'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from '@payloadcms/ui'

type ThemeToggleProps = {
  floating?: boolean
  className?: string
}

export default function ThemeToggle({ floating = true, className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? theme === 'dark' : true

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    setTheme(nextTheme)
  }

  return (
    <div
      className={`theme-toggle-container ${floating ? 'theme-toggle--floating' : ''} ${className}`}
      style={
        floating
          ? {
              position: 'fixed',
              top: '20px',
              right: '24px',
              zIndex: 9999,
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="theme-toggle-btn"
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '9999px',
          border: '1px solid var(--theme-elevation-200, rgba(255, 255, 255, 0.15))',
          background: 'var(--theme-elevation-100, rgba(18, 24, 32, 0.85))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--theme-elevation-800, #f8fafc)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(217, 119, 6, 0.15)',
            color: isDark ? '#fbbf24' : '#d97706',
            transition: 'transform 0.3s ease',
          }}
        >
          {isDark ? (
            // Moon icon
            <svg
              width="14"
              height="14"
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
            // Sun icon
            <svg
              width="14"
              height="14"
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
        </span>

        <span style={{ letterSpacing: '0.02em', userSelect: 'none' }}>
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      </button>
    </div>
  )
}
