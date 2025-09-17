import type { SessionCard, TranscriptFragment } from "../types/session";

export const demoTranscripts: TranscriptFragment[] = [
  {
    id: "demo-t-1",
    time: "10:05",
    text: "Сегодня разберём архитектуру AI Workshop Assistant и синхронизацию между фронтендом и бэкендом.",
    speaker: "Ведущий",
  },
  {
    id: "demo-t-2",
    time: "10:07",
    text: "Карточки генерируются по запросу, поэтому нам нужен быстрый отклик от OpenAI и локальное кеширование.",
    speaker: "Ведущий",
  },
  {
    id: "demo-t-3",
    time: "10:09",
    text: "Участники смогут видеть новую карточку на проекторе и возвращаться к истории через боковую панель.",
    speaker: "Ведущий",
  },
];

export const demoCards: SessionCard[] = [
  {
    id: "demo-c-1",
    title: "Архитектура воркшопа",
    content: `# Архитектура воркшопа\n- Фронтенд на React отображает карточки и транскрипт.\n- WebSocket поток обрабатывает аудио и обновления.\n- FastAPI координирует STT и генерацию контента.`,
    createdAt: new Date().toISOString(),
    layout: { x: 80, y: 60, width: 320, height: 240, zIndex: 1 },
  },
  {
    id: "demo-c-2",
    title: "Задачи MVP",
    content: `# Задачи MVP\n- Реальное время: минимальная задержка между речью и текстом.\n- Контроль сессии: старт/стоп записи, экспорт JSON.\n- Визуализация: крупные карточки + навигация для аудитории.`,
    createdAt: new Date().toISOString(),
    layout: { x: 440, y: 180, width: 320, height: 240, zIndex: 2 },
  },
];
