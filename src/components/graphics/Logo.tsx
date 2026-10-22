export default function Logo() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <img
        src="/assets/ethiopia-tour-logo.png"
        alt=""
        style={{
          width: '48px',
          height: '48px',
          objectFit: 'contain',
        }}
      />

      <span
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
        }}
      >
        Ethiopia Tour Blog
      </span>
    </div>
  )
}