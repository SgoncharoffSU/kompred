'use client'

import { useState } from 'react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: 'Расчёт бани', url }); return } catch {}
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 active:scale-[0.98]"
    >
      {copied ? (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Ссылка скопирована
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Поделиться расчётом
        </>
      )}
    </button>
  )
}

export function PrintButton() {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const root = document.getElementById('pdf-content') as HTMLElement
      if (!root) return

      // ── 1. Proxy images (same-origin → no CORS taint) ──
      const imgs = Array.from(root.querySelectorAll('img'))
      const origSrcs = imgs.map(img => img.src)
      imgs.forEach(img => {
        img.src = `/api/img-proxy?url=${encodeURIComponent(img.src)}`
      })
      await Promise.allSettled(imgs.map(img =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise(r => { img.onload = img.onerror = r })
      ))
      // Let the browser re-flow with loaded images
      await new Promise(r => setTimeout(r, 250))

      // ── 2. Collect cut points AFTER layout is stable ──
      // We want to cut between: top-level blocks AND individual option rows.
      // This way the options list splits row-by-row, not as one huge block.
      const rootRect = root.getBoundingClientRect()
      const rootH = rootRect.height   // viewport-relative height (consistent with getBCR)
      const cutsPx: number[] = []

      for (const child of Array.from(root.children) as HTMLElement[]) {
        const cr = child.getBoundingClientRect()
        // Bottom of this top-level block = one possible cut point
        cutsPx.push(cr.bottom - rootRect.top)

        // For the options card: also cut between individual option rows
        // so the block can split cleanly across pages
        const rowsContainer = child.querySelector('.divide-y') as HTMLElement | null
        if (rowsContainer) {
          for (const row of Array.from(rowsContainer.children) as HTMLElement[]) {
            const rr = row.getBoundingClientRect()
            cutsPx.push(rr.bottom - rootRect.top)
          }
        }
      }

      cutsPx.sort((a, b) => a - b)

      // ── 3. Render entire element as one canvas ──
      const canvas = await html2canvas(root, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#f2ece4',
        logging: false,
      })

      // Restore original srcs now that we have the canvas data
      imgs.forEach((img, i) => { img.src = origSrcs[i] })

      // ── 4. Build PDF ──
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      // Open at full page width (classic document view)
      pdf.setDisplayMode('fullwidth', 'continuous')

      const PW = 210   // A4 width mm
      const PH = 297   // A4 height mm

      // Total content height mapped to full A4 width
      const totalMm = (canvas.height / canvas.width) * PW

      // Convert pixel cut-points to mm in the PDF coordinate space
      const cutsMm = cutsPx.map(px => (px / rootH) * totalMm)

      let pageTop = 0
      let pageNum = 0

      while (pageTop < totalMm - 0.5) {
        if (pageNum > 0) pdf.addPage()

        const pageBottom = pageTop + PH

        // Find the latest cut point that still fits within this page.
        // Initialise at pageBottom so we hard-cut if nothing fits sooner.
        let cutAt = pageBottom
        for (const cut of cutsMm) {
          if (cut > pageTop + 1 && cut <= pageBottom) {
            cutAt = cut   // keep updating → ends up as the latest one
          }
        }
        // Clamp to actual content end (last page is usually shorter than PH)
        if (cutAt > totalMm) cutAt = totalMm

        // Slice the source canvas vertically for this page
        const yStartPx = Math.floor((pageTop / totalMm) * canvas.height)
        const yEndPx   = Math.ceil((cutAt  / totalMm) * canvas.height)
        const sliceHPx = yEndPx - yStartPx
        const sliceHMm = cutAt - pageTop

        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width  = canvas.width
        sliceCanvas.height = sliceHPx
        sliceCanvas.getContext('2d')!.drawImage(canvas, 0, -yStartPx)

        // Place flush to the top-left, stretching full A4 width
        pdf.addImage(
          sliceCanvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          0, 0,
          PW, sliceHMm,
        )

        pageTop = cutAt
        pageNum++
      }

      pdf.save('расчёт-бани.pdf')
    } catch (err) {
      console.error('PDF error:', err)
      alert('Не удалось создать PDF. Смотрите консоль браузера.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 active:scale-[0.98] disabled:opacity-60"
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Создаём PDF…
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Скачать PDF
        </>
      )}
    </button>
  )
}
