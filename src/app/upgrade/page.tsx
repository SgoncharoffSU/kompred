import Link from 'next/link'

const SUPPORT_EMAIL = 'info@glavinstrument.com'
const SUPPORT_PHONE = '+7 (999) 000-00-00'

const FEATURES = [
  'Неограниченное количество моделей и опций',
  'Уникальные ссылки на коммерческие предложения',
  'Скачивание PDF',
  'Фирменное оформление (логотип, цвета)',
  'Мультитенантность — изолированные данные',
  'Поддержка по email и телефону',
]

export default function UpgradePage() {
  return (
    <main className="min-h-screen bg-[#f2ece4] flex items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0d5a52] text-white text-2xl font-black mb-4">
            КП
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1a1612]">Подключите полный доступ</h1>
          <p className="mt-2 text-[#7a6f66]">Ваш тестовый период завершён. Выберите удобный способ оплаты.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#0d5a52] bg-white shadow-xl">
          <div className="bg-[#0d5a52] px-8 py-6 text-white">
            <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Тариф</div>
            <div className="text-3xl font-extrabold tracking-tight">Стандарт</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">1 490</span>
              <span className="text-lg opacity-70">₽ / месяц</span>
            </div>
            <p className="mt-1 text-sm opacity-60">или 14 900 ₽ / год (2 месяца в подарок)</p>
          </div>
          <div className="px-8 py-6 space-y-3">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#0d5a52]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-[#1a1612]">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Оплата КП Конфигуратора&body=Здравствуйте! Хочу оплатить подписку на КП Конфигуратор.`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[#e0d5c9] bg-white px-6 py-5 text-center shadow-sm transition hover:border-[#0d5a52] hover:shadow-md"
          >
            <span className="text-2xl">📧</span>
            <span className="font-bold text-[#1a1612]">Счёт на оплату</span>
            <span className="text-xs text-[#7a6f66]">Отправим счёт на вашу почту</span>
            <span className="mt-1 text-xs font-semibold text-[#0d5a52]">{SUPPORT_EMAIL}</span>
          </a>
          <a
            href={`tel:${SUPPORT_PHONE.replace(/\D/g, '')}`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[#e0d5c9] bg-white px-6 py-5 text-center shadow-sm transition hover:border-[#0d5a52] hover:shadow-md"
          >
            <span className="text-2xl">📞</span>
            <span className="font-bold text-[#1a1612]">Позвонить</span>
            <span className="text-xs text-[#7a6f66]">Оплата по телефону или онлайн</span>
            <span className="mt-1 text-xs font-semibold text-[#0d5a52]">{SUPPORT_PHONE}</span>
          </a>
        </div>

        <p className="text-center text-xs text-[#7a6f66]">
          После оплаты доступ активируется в течение 1 рабочего дня. Ваши данные сохранены и никуда не исчезнут.
        </p>

        <div className="text-center">
          <Link href="/login" className="text-sm text-[#0d5a52] underline underline-offset-2">
            ← Вернуться в аккаунт
          </Link>
        </div>
      </div>
    </main>
  )
}
