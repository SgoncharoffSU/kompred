// Fixed (not Math.random()) positions/sizes/rotations, so the very first server-rendered
// HTML matches the client's first paint exactly — real randomness here would cause a
// hydration mismatch. Values are hand-picked to read as scattered rather than a repeating
// grid, and deliberately land at different heights so the pattern still shows on long pages
// even though the layer itself doesn't scroll with the content.
const MARKS: { top: string; left: string; size: number; rotate: number }[] = [
  { top: '3%', left: '6%', size: 70, rotate: -14 },
  { top: '9%', left: '46%', size: 100, rotate: 9 },
  { top: '6%', left: '86%', size: 60, rotate: 22 },
  { top: '21%', left: '20%', size: 85, rotate: -22 },
  { top: '17%', left: '68%', size: 55, rotate: 16 },
  { top: '33%', left: '4%', size: 65, rotate: 12 },
  { top: '29%', left: '90%', size: 75, rotate: -8 },
  { top: '45%', left: '38%', size: 95, rotate: 27 },
  { top: '41%', left: '78%', size: 60, rotate: -18 },
  { top: '57%', left: '14%', size: 70, rotate: -30 },
  { top: '61%', left: '58%', size: 80, rotate: 10 },
  { top: '69%', left: '92%', size: 55, rotate: 20 },
  { top: '75%', left: '30%', size: 90, rotate: -12 },
  { top: '81%', left: '70%', size: 60, rotate: 15 },
  { top: '89%', left: '10%', size: 75, rotate: -20 },
  { top: '93%', left: '50%', size: 65, rotate: 8 },
  { top: '87%', left: '86%', size: 85, rotate: -26 },
]

// A barely-visible, chaotically scattered logo backdrop. Must be mounted as a DIRECT CHILD
// of the `position: relative` <main> that carries the page's own solid background color —
// per the CSS painting order, a negative z-index child paints in FRONT of its own parent's
// background (so the pattern shows) but BEHIND all normal, non-positioned content (so real
// page content still fully covers it). This only works relative to the RIGHT parent: an
// earlier version portaled this to document.body, which put its background one stacking
// context too far out — behind the ENTIRE app root, including the page's own opaque
// full-viewport fill, so it was invisible no matter what.
export function LogoWatermarkBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {MARKS.map((m, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src="/logo-siberia.svg"
          alt=""
          // Kept in its original brand color rather than inverted to white in dark mode — a
          // solid white shape, even at low opacity, reads as a hard-edged rectangle against a
          // near-black background (the SVG's own bounding box becomes visible as a "sharp
          // corner"), which is exactly what looked wrong here. The original color has much
          // lower luminance contrast against a dark background, so it stays a soft texture.
          style={{ position: 'absolute', top: m.top, left: m.left, width: m.size, transform: `rotate(${m.rotate}deg)` }}
          className="opacity-[0.07] dark:opacity-[0.06]"
        />
      ))}
    </div>
  )
}
