'use client'

import { useState } from 'react'

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // user closed the native share sheet — nothing to do
      }
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-xl border border-[#0d5a52]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#0d5a52] shadow-card transition-all duration-200 hover:bg-[#f0f7f5] active:scale-[0.98]"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? 'Скопировано!' : 'Поделиться расчётом'}
    </button>
  )
}
