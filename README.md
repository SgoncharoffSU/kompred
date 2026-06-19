# Конфигуратор и Калькулятор

Веб-приложение для конфигурации продукта (моделей, планировок, опций) с расчетом стоимости и админ-панелью.

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` и заполните переменные Supabase:

```bash
cp .env.example .env.local
```

Получите значения в [консоли Supabase](https://supabase.com):
- `NEXT_PUBLIC_SUPABASE_URL` - URL вашего проекта
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - анонимный ключ
- `SUPABASE_SERVICE_ROLE_KEY` - сервис-ролевой ключ

### 3. Создание базы данных

Выполните SQL миграцию в Supabase SQL Editor:
```
1. Откройте SQL Editor в консоли Supabase
2. Скопируйте содержимое файла `supabase/migrations/001_create_schema.sql`
3. Выполните запрос
```

### 4. Запуск dev-сервера

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

## Структура проекта

```
src/
├── app/                  # Next.js App Router страницы
├── components/          # React компоненты
├── lib/                 # Утилиты и конфигурация
├── services/            # API сервисы (Supabase)
├── stores/              # Zustand хранилища
├── styles/              # Глобальные стили
└── types/               # TypeScript типы
```

## Основные компоненты

### Конфигуратор
Многошаговая форма для создания конфигурации:
- **Шаг 1**: Выбор модели
- **Шаг 2**: Выбор планировки
- **Шаг 3**: Настройка опций
- **Шаг 4**: Просмотр и экспорт результата

### Админ-панель (`/admin`)
Управление контентом:
- Модели (CRUD)
- Планировки с загрузкой изображений
- Группы опций
- Опции с миниатюрами

### Страница результата (`/calc/[slug]`)
Отображение конфигурации в формате:
1. Hero Block - изображение и слоган
2. Motivation Block - вдохновляющий текст
3. Summary Block - список выбранных опций
4. Footer Block - итоговая цена и кнопки

## Технологический стек

- **Frontend**: Next.js 14+, React 18, TypeScript
- **UI**: Tailwind CSS, Shadcn/UI, Lucide Icons
- **Состояние**: Zustand
- **Формы**: React Hook Form + Zod
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **PDF**: @react-pdf/renderer

## API Services

Все операции с БД находятся в `src/services/api.ts`:

```typescript
// Модели
modelService.getAllModels()
modelService.getModelById(id)
modelService.createModel(model)
modelService.updateModel(id, updates)
modelService.deleteModel(id)

// Планировки
layoutService.getLayoutsByModel(modelId)
layoutService.getLayoutById(id)
layoutService.createLayout(layout)
layoutService.updateLayout(id, updates)
layoutService.deleteLayout(id)

// Группы опций
optionGroupService.getOptionGroupsByModel(modelId)
optionGroupService.createOptionGroup(group)
optionGroupService.updateOptionGroup(id, updates)
optionGroupService.deleteOptionGroup(id)

// Опции
optionService.getOptionsByGroup(groupId)
optionService.createOption(option)
optionService.updateOption(id, updates)
optionService.deleteOption(id)
```

## State Management (Zustand)

```typescript
import { useConfiguratorStore } from '@/stores/configurator'

const store = useConfiguratorStore()
store.setModel(modelId)
store.setLayout(layoutId)
store.setOption(groupId, optionId, selectionType)
store.removeOption(groupId, optionId)
store.reset()
```

## Развертывание

```bash
npm run build
npm start
```

Приложение готово к развертыванию на Vercel или других платформах.

## Лицензия

MIT
