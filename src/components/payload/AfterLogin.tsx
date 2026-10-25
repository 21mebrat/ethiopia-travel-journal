'use client'

import React from 'react'

export default function AfterLogin() {
  return (
    <div
      className="login-after-container"
      style={{
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid var(--theme-elevation-150, rgba(255, 255, 255, 0.08))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--theme-elevation-500, #94a3b8)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
          }}
        />
        <span>Secure Session &bull; Role-Based Access</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--theme-elevation-400, #64748b)',
        }}
      >
        <span>Locales:</span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--theme-elevation-100, rgba(255,255,255,0.06))',
            fontWeight: 500,
          }}
        >
          English (en)
        </span>
        <span>&bull;</span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--theme-elevation-100, rgba(255,255,255,0.06))',
            fontWeight: 500,
          }}
        >
          Amharic (am - አማርኛ)
        </span>
      </div>

      <p
        style={{
          margin: '4px 0 0',
          fontSize: '11px',
          color: 'var(--theme-elevation-400, #64748b)',
        }}
      >
        Ethiopia Tour Blog &bull; Content Management System
      </p>
    </div>
  )
}
