export default function Logo() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '14px',
        padding: '4px 0',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(16, 185, 129, 0.15))',
          border: '1px solid rgba(217, 119, 6, 0.3)',
          boxShadow: '0 8px 20px -4px rgba(217, 119, 6, 0.25)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <img
          src="/assets/ethiopia-tour-logo.png"
          alt="Ethiopia Tour Blog Logo"
          style={{
            width: '44px',
            height: '44px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          lineHeight: 1.15,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ethiopia
          </span>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--theme-elevation-900, inherit)',
            }}
          >
            Tour Blog
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--theme-elevation-500, #94a3b8)',
            marginTop: '3px',
          }}
        >
          Travel &amp; Culture Journal
        </span>
      </div>
    </div>
  )
}