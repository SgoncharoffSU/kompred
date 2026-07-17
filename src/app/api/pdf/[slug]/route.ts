import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'

export const dynamic = 'force-dynamic'

// A fresh browser per request, closed immediately after — no persistent Chromium process
// sitting in memory between downloads, since this VPS also runs several other clients'
// services and RAM is tight even without it.
async function launchBrowser() {
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  if (!executablePath) {
    throw new Error('CHROMIUM_EXECUTABLE_PATH is not set — see php_hosting notes / deploy docs for the install step.')
  }
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
}

async function renderPdf(targetUrl: string): Promise<Buffer | 'not-found'> {
  let browser
  try {
    browser = await launchBrowser()
    const page = await browser.newPage()
    await page.setViewport({ width: 900, height: 1400 })
    const response = await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 })
    if (!response || !response.ok()) return 'not-found'
    // The offer page already has print:hidden on its action buttons (for the old
    // window.print() flow) — emulating print media reuses that same clean layout for the PDF
    // for free, no separate print-only markup needed.
    await page.emulateMediaType('print')
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    if (browser) await browser.close()
  }
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // Must be a public https URL, not the internal loopback: offer images use relative
  // /uploads/ paths that only nginx serves, so Chrome needs to go through the real domain
  // (any tenant domain works — /calc/[slug] is domain-agnostic) to fetch them correctly.
  const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:8016'
  const targetUrl = `${siteUrl}/calc/${encodeURIComponent(slug)}`

  // Chrome occasionally crashes mid-render on this memory-constrained shared VPS
  // (renderer process gets killed under pressure from the other tenants' services) —
  // one retry with a fresh browser instance absorbs that without surfacing an error to the user.
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await renderPdf(targetUrl)
      if (result === 'not-found') return NextResponse.json({ error: 'offer not found' }, { status: 404 })
      return new NextResponse(new Uint8Array(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="kp-${slug}.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    } catch (err) {
      lastErr = err
    }
  }
  console.error('PDF generation failed:', lastErr)
  return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
}
