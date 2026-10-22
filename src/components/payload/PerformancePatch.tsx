'use client'

import React from 'react'

// Workaround for Next.js 15/16 + React 19 Turbopack dev issue:
// "Failed to execute 'measure' on 'Performance': 'LoginView' cannot have a negative time stamp."
if (typeof window !== 'undefined' && !(window as any).__perfMeasurePatched) {
  ;(window as any).__perfMeasurePatched = true

  const patchMeasure = (target: any) => {
    if (!target || typeof target.measure !== 'function') return
    const originalMeasure = target.measure

    target.measure = function (name: string, startOrOptions?: any, end?: any) {
      try {
        if (startOrOptions && typeof startOrOptions === 'object') {
          if (typeof startOrOptions.start === 'number' && startOrOptions.start < 0) {
            startOrOptions.start = 0
          }
          if (typeof startOrOptions.end === 'number' && startOrOptions.end < 0) {
            startOrOptions.end = 0
          }
          if (typeof startOrOptions.duration === 'number' && startOrOptions.duration < 0) {
            startOrOptions.duration = 0
          }
        }
        return originalMeasure.call(this, name, startOrOptions, end)
      } catch (err: any) {
        if (err?.message && err.message.includes('negative time stamp')) {
          return undefined
        }
        throw err
      }
    }
  }

  if (typeof window.Performance !== 'undefined' && window.Performance.prototype) {
    patchMeasure(window.Performance.prototype)
  }
  if (typeof window.performance !== 'undefined') {
    patchMeasure(window.performance)
  }
}

export default function PerformancePatch({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}
