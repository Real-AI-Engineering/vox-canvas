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
    name: "Meeting Summary",
    description: "Automatically create a brief meeting summary",
    type: "summary",
    prompt: "Create a structured meeting summary including: main topics, decisions made, assigned tasks, and next steps.",
    refreshInterval: 300, // 5 minutes
    autoUpdate: true,
    category: "analytics",
    tags: ["meeting", "summary", "decisions"],
    example: "# Meeting Summary\n## Main Topics\n- Project planning\n- Resource allocation\n## Decisions\n- Budget approved\n- Project manager assigned"
  },
  {
    id: "keyword-tracker",
    name: "Keywords Tracker",
    description: "Track mentions of important terms",
    type: "keywords",
    prompt: "Extract and track keywords and terms from the discussion",
    autoUpdate: true,
    refreshInterval: 60,
    category: "analytics",
    tags: ["keywords", "analysis", "terms"],
    example: "project (15), budget (8), team (12), deadline (5)"
  },
  {
    id: "sentiment-monitor",
    name: "Mood Monitor",
    description: "Track the emotional tone of the conversation",
    type: "sentiment",
    prompt: "Analyze the emotional tone and mood of discussion participants",
    autoUpdate: true,
    refreshInterval: 120,
    category: "analytics",
    tags: ["emotions", "mood", "sentiment"],
    example: "Overall tone: Positive (75%)\nProject enthusiasm is high"
  },

  // Productivity Templates
  {
    id: "action-items",
    name: "Action Items",
    description: "Automatically extract tasks and actions",
    type: "list",
    prompt: "Extract all mentioned tasks, actions, and assignments from the conversation. Structure as a checklist.",
    systemPrompt: "You are a productivity assistant. Extract specific, actionable tasks from discussions.",
    autoUpdate: true,
    updateConditions: ["task", "assignment", "need", "do", "complete"],
    category: "productivity",
    tags: ["tasks", "todo", "actions"],
    example: "- [ ] Prepare presentation\n- [ ] Contact client\n- [ ] Update documentation"
  },
  {
    id: "decision-tracker",
    name: "Decision Tracker",
    description: "Record decisions made and agreements reached",
    type: "static",
    prompt: "Identify all decisions made, agreements reached, and approvals given in the discussion.",
    updateConditions: ["decided", "agreed", "approved", "confirmed"],
    category: "productivity",
    tags: ["decisions", "agreements", "approvals"],
    example: "## Decisions Made\n1. Project budget: $50,000\n2. Deadline: March 15\n3. Team size: 5 people"
  },
  {
    id: "question-collector",
    name: "Question Collector",
    description: "Collects all questions asked for subsequent review",
    type: "list",
    prompt: "Collect all questions that were asked during the discussion, including those that still need answers.",
    updateConditions: ["?", "question", "how", "why", "when", "where"],
    category: "productivity",
    tags: ["questions", "Q&A", "clarifications"],
    example: "## Open Questions\n- When do we start testing?\n- Who is responsible for documentation?\n- What's the marketing budget?"
  },

  // Communication Templates
  {
    id: "participant-tracker",
    name: "Participant Tracker",
    description: "Track participant activity and contributions",
    type: "custom",
    prompt: "Track participant activity: who spoke how much, what ideas they proposed, what role they played in the discussion.",
    category: "communication",
    tags: ["participants", "activity", "contributions"],
    example: "## Participant Activity\n**Anna**: Moderator, 40% speaking time\n**Peter**: Expert, 25% speaking time\n**Maria**: Analyst, 35% speaking time"
  },
  {
    id: "objection-tracker",
    name: "Objection Tracker",
    description: "Record objections and counterarguments",
    type: "list",
    prompt: "Identify all objections, doubts, and counterarguments expressed during the discussion.",
    updateConditions: ["but", "however", "disagree", "doubt", "problem"],
    category: "communication",
    tags: ["objections", "problems", "risks"],
    example: "## Objections and Risks\n- Tight deadlines may lead to errors\n- Budget may be insufficient\n- Lack of expertise in the team"
  },

  // Custom Templates
  {
    id: "custom-notes",
    name: "Personal Notes",
    description: "Card for personal notes and insights",
    type: "custom",
    prompt: "Create space for personal notes and observations.",
    category: "custom",
    tags: ["notes", "personal", "insights"],
    example: "## My Notes\n\n*Space for your thoughts and insights*"
  },
  {
    id: "quote-collector",
    name: "Quote Collection",
    description: "Collects important statements and quotes",
    type: "list",
    prompt: "Identify the most important and interesting statements from the conversation.",
    category: "custom",
    tags: ["quotes", "statements", "thoughts"],
    example: "## Key Statements\n> \"Quality is more important than speed\"\n> \"Team is our main asset\""
  },
  {
    id: "word-frequency",
    name: "Word Frequency",
    description: "Count frequency of specific word usage",
    type: "counter",
    prompt: "Count mentions of the word 'project' in the conversation",
    autoUpdate: true,
    category: "analytics",
    tags: ["counter", "statistics", "frequency"],
    example: "Word 'project' mentioned 15 times"
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