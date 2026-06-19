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
  title: 'Сиберия — Конфигуратор бани',
  description: 'Выберите модель, планировку и комплектацию — получите персональный расчёт за минуту',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
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
