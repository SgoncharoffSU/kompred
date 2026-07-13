import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import '@/styles/globals.css'

const manrope = Manrope({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Конфигуратор бани',
  description: 'Создайте идеальную конфигурацию и рассчитайте стоимость вашей бани',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
