import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import '@/styles/globals.css'

const manrope = Manrope({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Конфигуратор коммерческих предложений',
  description: 'Выберите модель, планировку и комплектацию — получите персональный расчёт за минуту',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

const themeInitScript = `
  (function(){
    try {
      var t = localStorage.getItem('kp-theme');
      if (t === 'dark') document.documentElement.classList.add('dark');
    } catch(e){}
  })()
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={manrope.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
