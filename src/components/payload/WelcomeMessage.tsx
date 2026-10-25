'use client'

import ThemeToggle from './ThemeToggle'

export default function WelcomeMessage() {
  return (
    <>
      {/* Floating Theme Toggle in top-right */}
      <ThemeToggle floating={true} />
      <p className="m-0 text-[13.5px] leading-relaxed text-muted-foreground max-w-85 text-center mx-auto">
        Sign in to manage destinations, stories, and multimedia content in English and Amharic.
      </p>
    </>
  )
}