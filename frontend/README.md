# Vox Canvas Frontend

React + Vite интерфейс для AI Workshop Assistant. Цель — отображать поток транскрипции, управлять карточками и предоставлять удобный презентер-дисплей.

## Стек
- React 19 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`) с кастомной цифровой палитрой
- React Markdown для рендеринга контента карточек

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
- `src/App.tsx` — каркас приложения, состояния сессии и демо-данные
- `src/index.css` — Tailwind v4 с импортом через `@import "tailwindcss"`
- `tailwind.config.ts` — тема, цвета и подключение плагинов (`@tailwindcss/typography`)

## Следующие шаги
1. Подключить реальные WebSocket/REST вызовы для транскрипта и карточек.
2. Добавить глобальный стор (Zustand или Jotai) для синхронизации состояния.
3. Интегрировать роутинг/макеты для режима стриминга и контроллера ведущего.
