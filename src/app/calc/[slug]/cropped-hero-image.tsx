'use client'

import { useEffect, useRef } from 'react'

type CropRect = {
  mode?: 'position' | 'crop'
  x: number
  y: number
  w?: number
  h?: number
}

export function CroppedHeroImage({ src, crop, alt, className }: { src: string; crop: CropRect | null; alt: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    const wrap = wrapRef.current
    if (!img || !wrap || !crop || crop.mode === 'position') return
    const apply = () => {
      if (!img.naturalWidth) return
      const cw = wrap.clientWidth
      const ch = wrap.clientHeight
      if (!cw || !ch) return
      const { x, y, w = 100, h = 100 } = crop
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      const scale = Math.max(cw / (nw * (w / 100)), ch / (nh * (h / 100)))
      img.style.width = `${nw * scale}px`
      img.style.height = `${nh * scale}px`
      img.style.left = `${-((nw * x) / 100) * scale}px`
      img.style.top = `${-((nh * y) / 100) * scale}px`
    }
    const resizeObserver = new ResizeObserver(() => {
      if (img.naturalWidth) apply()
    })
    resizeObserver.observe(wrap)
    if (img.complete && img.naturalWidth) requestAnimationFrame(apply)
    else img.addEventListener('load', apply, { once: true })
    return () => {
      resizeObserver.disconnect()
      img.removeEventListener('load', apply)
    }
  }, [crop, src])

  if (crop && crop.mode !== 'position') {
    return (
      <div ref={wrapRef} className={`relative overflow-hidden ${className ?? ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          aria-hidden
          style={{
            position: 'absolute',
            top: -32,
            left: -32,
            width: 'calc(100% + 64px)',
            height: 'calc(100% + 64px)',
            objectFit: 'cover',
            filter: 'blur(20px) saturate(1.2)',
            pointerEvents: 'none',
          }}
          alt=""
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={src} alt={alt} style={{ position: 'absolute', maxWidth: 'none', maxHeight: 'none' }} />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className ?? 'h-full w-full object-cover'}
      style={crop?.mode === 'position' ? { objectPosition: `${crop.x}% ${crop.y}%`, objectFit: 'cover' } : undefined}
    />
  )
}
