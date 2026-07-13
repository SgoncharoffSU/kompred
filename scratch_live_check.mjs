import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('https://kp.glavinstrument.com/cli1238?model=9&design=classic', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'C:/Users/sgonc/AppData/Local/Temp/claude/c--Projects-bathhouse/931492cb-380d-4f69-acfd-ffcb2a4c4e93/scratchpad/live_full.png', fullPage: false })
const header = page.locator('header')
await header.screenshot({ path: 'C:/Users/sgonc/AppData/Local/Temp/claude/c--Projects-bathhouse/931492cb-380d-4f69-acfd-ffcb2a4c4e93/scratchpad/live_header.png' })

// favicon check
const iconRes = await page.goto('https://kp.glavinstrument.com/icon.png')
console.log('icon.png status:', iconRes.status(), 'content-type:', iconRes.headers()['content-type'])
const buf = await iconRes.body()
console.log('icon.png size bytes:', buf.length)

await browser.close()
