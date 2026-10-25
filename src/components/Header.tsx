'use client'

import React from 'react'
import ThemeToggle from './payload/ThemeToggle'

export default function Header() {
  return (
    <header
      className="ethiopia-admin-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'var(--theme-elevation-50, rgba(255, 255, 255, 0.02))',
        borderBottom: '1px solid var(--theme-elevation-150, rgba(255, 255, 255, 0.08))',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--theme-elevation-900, inherit)',
            }}
          >
            Ethiopia Tour Blog
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(217, 119, 6, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              letterSpacing: '0.04em',
            }}
          >
            EDITORIAL
          </span>
        </div>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: '12px',
            color: 'var(--theme-elevation-500, #94a3b8)',
          }}
        >
          Manage travel stories, cultural heritage articles &amp; media destinations.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ThemeToggle floating={false} />
      </div>
    </header>
  )
}