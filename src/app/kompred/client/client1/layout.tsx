import type { Metadata } from 'next'
import { headers } from 'next/headers'

// Mirrors the client-side map in page.tsx — custom domains like siberiaa.ru resolve their
// account by hostname since their /cli link has no {N} suffix.
const HOSTNAME_ACCOUNT_MAP: Record<string, string> = {
  'siberiaa.ru': '1238',
  'www.siberiaa.ru': '1238',
}

const DEFAULT_DESCRIPTION = 'Соберите свою баню онлайн — выберите модель, планировку и опции, получите расчёт за минуту'

function absoluteUrl(url: string, origin: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`
}

export async function generateMetadata(): Promise<Metadata> {
  const h = headers()
  const host = h.get('host') || ''
  // Not read from x-forwarded-proto: nginx doesn't set that header on this route, and every
  // domain this app serves is https-only (with an http→https redirect), so there's no case
  // where plain http is the correct origin here.
  const origin = `https://${host}`
  // nginx rewrites /cli{N} to this route internally, so req.url never carries the original
  // path — the /cli location block forwards it separately via this header instead.
  const originalUri = h.get('x-original-uri') || ''

  const accountMatch = originalUri.match(/\/cli(\d+)/)
  const account = accountMatch ? accountMatch[1] : HOSTNAME_ACCOUNT_MAP[host] || null

  const fallback: Metadata = {
    title: 'Конфигуратор коммерческих предложений',
    description: DEFAULT_DESCRIPTION,
  }
  if (!account) return fallback

  try {
    const lookupRes = await fetch(`${origin}/api/workspace-lookup?account=${account}`, { cache: 'no-store' })
    const lookup = await lookupRes.json()
    const workspaceName: string = lookup.workspace_name || 'СК Сибирия'
    const description: string = lookup.share_slogan || DEFAULT_DESCRIPTION
    const wid = lookup.php_workspace_id || 1

    const modelMatch = originalUri.match(/[?&]model=(\d+)/)
    const modelParam = modelMatch ? `&model_id=${modelMatch[1]}` : ''
    const previewRes = await fetch(`${origin}/api/php-proxy?action=get_share_preview&wid=${wid}${modelParam}`, { cache: 'no-store' })
    const preview = await previewRes.json()
    const image = preview.ok && preview.image_url ? absoluteUrl(preview.image_url, origin) : undefined

    return {
      title: workspaceName,
      description,
      openGraph: {
        title: workspaceName,
        description,
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: workspaceName,
        description,
        images: image ? [image] : undefined,
      },
    }
  } catch {
    return fallback
  }
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return children
}
