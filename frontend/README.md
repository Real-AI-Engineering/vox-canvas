# Vox Canvas Frontend

React + Vite интерфейс для AI Workshop Assistant. Цель — отображать поток транскрипции, управлять карточками и предоставлять удобный презентер-дисплей.

## Стек
- React 19 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`) с кастомной цифровой палитрой
- React Markdown для рендеринга контента карточек
- Zustand + `react-rnd` для управления состоянием и позиционированием карточек

## Команды
```bash
pnpm install
pnpm run dev      # старт дев-сервера
pnpm run build    # сборка production
pnpm run preview  # предпросмотр собранной версии
pnpm run lint     # проверка ESLint
```

### Переменные окружения
- Скопируйте `.env.example` → `.env` и укажите `VITE_API_URL` (по умолчанию `http://localhost:8000`).
- Для первого `pnpm install` одобрите запуск бинарей Tailwind: `pnpm --dir frontend approve-builds`.

## Архитектура интерфейса
- `src/state/sessionStore.ts` — Zustand-хранилище (системный промпт, WebSocket, карточки, транскрипт)
- `src/components/StickyCard.tsx` — стикеры на полотне с поддержкой drag + resize (`react-rnd`)
- `src/components/ToastProvider.tsx`, `ReconnectionBanner.tsx`, `SessionStatus.tsx` — уведомления и статусы
- `src/App.tsx` — холст, форма создания карточек, редактор системного промпта и история транскрипта
- `src/index.css` — Tailwind v4 с импортом через `@import "tailwindcss"`
- `tailwind.config.ts` — тема, цвета и подключение плагинов (`@tailwindcss/typography`)

## Следующие шаги
1. Подключить реальный бэкенд (настроить `VITE_API_URL`, авторизацию Google STT/Vosk, OpenAI ключ).
2. Добавить уведомления об успешном создании карточек и доп. визуальные подсказки по переподключению.
3. Настроить CI (lint + build) и smoke-тесты для фронтенда.
