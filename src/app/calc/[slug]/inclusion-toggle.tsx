'use client'

import { useState } from 'react'

type InclusionSection = {
  id: string
  name: string
  items: string[]
}

export function InclusionToggle({ sections }: { sections: InclusionSection[] }) {
  const [open, setOpen] = useState(false)
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="print:hidden overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-3.5 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">
          Что входит в базовую комплектацию
          <span className="ml-2 normal-case font-normal text-[#b0a499]">{totalItems} пунктов</span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-[#7a6f66] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="divide-y divide-[#e0d5c9] border-t border-[#e0d5c9]">
          {sections.map((section) => (
            <div key={section.id} className="px-6 py-4">
              <div className="text-sm font-semibold text-[#1a1612]">{section.name}</div>
              <ul className="mt-2 space-y-1.5">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#7a6f66]">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#0d5a52]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
