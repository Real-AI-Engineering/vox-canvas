import type { CardType } from "../types/session";

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  type: CardType;
  prompt: string;
  systemPrompt?: string;
  refreshInterval?: number;
  autoUpdate?: boolean;
  updateConditions?: string[];
  category: "analytics" | "productivity" | "communication" | "custom";
  tags: string[];
  example?: string;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  // Analytics Templates
  {
    id: "meeting-summary",
    name: "Саммари встречи",
    description: "Автоматическое создание краткого содержания встречи",
    type: "summary",
    prompt: "Создай структурированное саммари встречи, включая: основные темы, принятые решения, назначенные задачи и следующие шаги.",
    refreshInterval: 300, // 5 minutes
    autoUpdate: true,
    category: "analytics",
    tags: ["встреча", "саммари", "решения"],
    example: "# Саммари встречи\n## Основные темы\n- Планирование проекта\n- Распределение ресурсов\n## Решения\n- Утвержден бюджет\n- Назначен менеджер проекта"
  },
  {
    id: "keyword-tracker",
    name: "Трекер ключевых слов",
    description: "Отслеживание упоминания важных терминов",
    type: "keywords",
    prompt: "Извлеки и отследи ключевые слова и термины из обсуждения",
    autoUpdate: true,
    refreshInterval: 60,
    category: "analytics",
    tags: ["ключевые слова", "анализ", "термины"],
    example: "проект (15), бюджет (8), команда (12), дедлайн (5)"
  },
  {
    id: "sentiment-monitor",
    name: "Монитор настроения",
    description: "Отслеживание эмоционального тона разговора",
    type: "sentiment",
    prompt: "Анализируй эмоциональный тон и настроение участников обсуждения",
    autoUpdate: true,
    refreshInterval: 120,
    category: "analytics",
    tags: ["эмоции", "настроение", "тональность"],
    example: "Общий тон: Позитивный (75%)\nЭнтузиазм по проекту высокий"
  },

  // Productivity Templates
  {
    id: "action-items",
    name: "Список действий",
    description: "Автоматическое выделение задач и действий",
    type: "list",
    prompt: "Выдели все упомянутые задачи, действия и поручения из разговора. Структурируй как чек-лист.",
    systemPrompt: "Ты помощник по продуктивности. Извлекай конкретные, выполнимые задачи из обсуждений.",
    autoUpdate: true,
    updateConditions: ["задача", "поручение", "нужно", "сделать", "выполнить"],
    category: "productivity",
    tags: ["задачи", "todo", "действия"],
    example: "- [ ] Подготовить презентацию\n- [ ] Связаться с клиентом\n- [ ] Обновить документацию"
  },
  {
    id: "decision-tracker",
    name: "Трекер решений",
    description: "Фиксация принятых решений и договоренностей",
    type: "static",
    prompt: "Выдели все принятые решения, договоренности и утверждения из обсуждения.",
    updateConditions: ["решили", "договорились", "утвердили", "одобрили"],
    category: "productivity",
    tags: ["решения", "договоренности", "утверждения"],
    example: "## Принятые решения\n1. Бюджет проекта: 500к рублей\n2. Дедлайн: 15 марта\n3. Команда: 5 человек"
  },
  {
    id: "question-collector",
    name: "Сборщик вопросов",
    description: "Собирает все заданные вопросы для последующего разбора",
    type: "list",
    prompt: "Собери все вопросы, которые были заданы в ходе обсуждения, включая те, на которые еще нет ответов.",
    updateConditions: ["?", "вопрос", "как", "почему", "когда", "где"],
    category: "productivity",
    tags: ["вопросы", "Q&A", "разъяснения"],
    example: "## Открытые вопросы\n- Когда запускаем тестирование?\n- Кто отвечает за документацию?\n- Какой бюджет на маркетинг?"
  },

  // Communication Templates
  {
    id: "participant-tracker",
    name: "Трекер участников",
    description: "Отслеживание активности и вклада участников",
    type: "custom",
    prompt: "Отследи активность участников: кто сколько говорил, какие идеи предлагал, какую роль играл в обсуждении.",
    category: "communication",
    tags: ["участники", "активность", "вклад"],
    example: "## Активность участников\n**Анна**: Модератор, 40% времени\n**Петр**: Эксперт, 25% времени\n**Мария**: Аналитик, 35% времени"
  },
  {
    id: "objection-tracker",
    name: "Трекер возражений",
    description: "Фиксирует возражения и контраргументы",
    type: "list",
    prompt: "Выдели все возражения, сомнения и контраргументы, высказанные в ходе обсуждения.",
    updateConditions: ["но", "однако", "не согласен", "сомневаюсь", "проблема"],
    category: "communication",
    tags: ["возражения", "проблемы", "риски"],
    example: "## Возражения и риски\n- Сжатые сроки могут привести к ошибкам\n- Бюджет может оказаться недостаточным\n- Нехватка экспертизы в команде"
  },

  // Custom Templates
  {
    id: "custom-notes",
    name: "Личные заметки",
    description: "Карточка для личных заметок и выводов",
    type: "custom",
    prompt: "Создай пространство для личных заметок и наблюдений.",
    category: "custom",
    tags: ["заметки", "личное", "выводы"],
    example: "## Мои заметки\n\n*Место для ваших мыслей и выводов*"
  },
  {
    id: "quote-collector",
    name: "Коллекция цитат",
    description: "Собирает важные высказывания и цитаты",
    type: "list",
    prompt: "Выдели самые важные и интересные высказывания из разговора.",
    category: "custom",
    tags: ["цитаты", "высказывания", "мысли"],
    example: "## Ключевые высказывания\n> \"Качество важнее скорости\"\n> \"Команда - наш главный актив\""
  },
  {
    id: "word-frequency",
    name: "Частота слов",
    description: "Подсчет частоты использования конкретного слова",
    type: "counter",
    prompt: "Подсчитывай количество упоминаний слова 'проект' в разговоре",
    autoUpdate: true,
    category: "analytics",
    tags: ["счетчик", "статистика", "частота"],
    example: "Слово 'проект' упомянуто 15 раз"
  }
];

export const getTemplatesByCategory = (category: CardTemplate["category"]) =>
  CARD_TEMPLATES.filter(template => template.category === category);

export const getTemplatesByTag = (tag: string) =>
  CARD_TEMPLATES.filter(template => template.tags.includes(tag));

export const getTemplateById = (id: string) =>
  CARD_TEMPLATES.find(template => template.id === id);

export const getAllTags = () => {
  const tags = new Set<string>();
  CARD_TEMPLATES.forEach(template => {
    template.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags).sort();
};