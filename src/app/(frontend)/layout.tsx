import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Ethiopia Travel Journal & Tour Blog - Cultural Heritage and Travel Stories.',
  title: 'Ethiopia Travel Journal',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
