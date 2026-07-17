'use client'

import { useState } from 'react'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

export function PrintButton({ slug, className }: { slug: string; className?: string }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (downloading) return

    // iOS Safari doesn't support forced downloads via blob + <a download> — the click
    // either silently no-ops or opens the blob as a dead-end tab with no address bar.
    // Navigating straight to the endpoint instead lets Safari's native PDF viewer handle
    // it, from which the user can use the share sheet to save it — the only way iOS allows
    // saving a PDF from the browser. Must happen synchronously in the click handler, not
    // after an await, or Safari's popup blocker kills it.
    if (isIOS()) {
      window.open(`/api/pdf/${encodeURIComponent(slug)}`, '_blank')
      return
    }

    setDownloading(true)
    try {
      const res = await fetch(`/api/pdf/${encodeURIComponent(slug)}`)
      if (!res.ok) throw new Error('failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kp-${slug}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Не удалось сформировать PDF, попробуйте ещё раз')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center gap-2 rounded-xl border border-[#0d5a52]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#0d5a52] shadow-card transition-all duration-200 hover:bg-[#f0f7f5] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ''}`}
    >
      {downloading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      )}
      {downloading ? 'Формируем…' : 'Скачать PDF'}
    </button>
  )
}
