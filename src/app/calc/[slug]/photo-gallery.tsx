'use client'

import { useState } from 'react'
import { CroppedHeroImage } from './cropped-hero-image'

type GalleryPhoto = {
  image_url: string
  crop?: { mode?: 'position' | 'crop'; x: number; y: number; w?: number; h?: number } | null
}

// Sits inside the page's own "relative overflow-hidden rounded-2xl" hero wrapper, alongside
// the title gradient overlay — arrows/dots use a higher z-index so they stay clickable above
// it regardless of paint order.
export function PhotoGallery({ photos, alt }: { photos: GalleryPhoto[]; alt: string }) {
  const [index, setIndex] = useState(0)
  if (photos.length === 0) return null

  const goTo = (next: number) => setIndex(((next % photos.length) + photos.length) % photos.length)

  return (
    <div className="aspect-video w-full overflow-hidden">
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ width: `${photos.length * 100}%`, transform: `translateX(-${index * (100 / photos.length)}%)` }}
      >
        {photos.map((photo, i) => (
          <div key={i} className="h-full shrink-0" style={{ width: `${100 / photos.length}%` }}>
            <CroppedHeroImage src={photo.image_url} crop={photo.crop ?? null} alt={alt} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Предыдущее фото"
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Следующее фото"
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Фото ${i + 1}`}
                className={`h-1.5 rounded-full shadow-sm transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
