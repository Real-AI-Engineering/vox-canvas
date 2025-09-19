import { useCallback, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import type { CardLayout, SessionCard } from "../types/session";
import { useSessionStore } from "../state/sessionStore";

const DEFAULT_LAYOUT: CardLayout = {
  x: 80,
  y: 80,
  width: 240,
  height: 180,
};

interface CounterCardProps {
  card: SessionCard;
  onLayoutChange: (id: string, layout: CardLayout) => void;
  onEdit: (card: SessionCard) => void;
}

export function CounterCard({ card, onLayoutChange, onEdit }: CounterCardProps) {
  const layout = card.layout ?? DEFAULT_LAYOUT;
  const transcripts = useSessionStore((state) => state.transcripts);
  const [count, setCount] = useState(0);
  const [targetWord, setTargetWord] = useState<string>("");

  useEffect(() => {
    console.log('=== CounterCard useEffect triggered ===');
    console.log('Transcripts count:', transcripts.length);
    console.log('Transcripts:', transcripts);

    // Parse update rule, prompt or content to get the word to count
    const ruleText = card.updateRule || card.prompt || "";
    const contentText = card.content || "";
    const allText = `${ruleText} ${contentText}`;

    console.log('CounterCard data:', {
      updateRule: card.updateRule,
      prompt: card.prompt,
      content: card.content,
      title: card.title,
      allText: allText
    });

    // Try different patterns to extract the target word
    // Pattern 1: "счетчик слова 'дом'" with quotes
    let wordMatch = allText.match(/слов[ао]?\s+["'«]([^"'»]+)["'»]/i);

    if (!wordMatch) {
      // Pattern 2: "Create word counter home" - word after "word"
      wordMatch = allText.match(/слов[ао]?\s+["'«]?([а-яёА-ЯЁ]+)["'»]?/i);
    }

    if (!wordMatch) {
      // Pattern 3: "Count word 'home'" or similar patterns
      wordMatch = allText.match(/(?:подсчет|подсчитать|счетчик|считай|счёт)\s+слов[ао]?\s+["'«]?([а-яёА-ЯЁ]+)["'»]?/i);
    }

    if (!wordMatch) {
      // Pattern 4: Anything in quotes
      wordMatch = allText.match(/["']([^"']+)["']/);
    }

    if (!wordMatch) {
      // Pattern 5: Find the most likely target word (skip common words)
      const words = allText.match(/\b([а-яёА-ЯЁ]+)\b/g);
      if (words) {
        const skipWords = ['create', 'counter', 'word', 'words', 'count', 'counting', 'number', 'from', 'transcript', 'display', 'and', 'for', 'card', 'создай', 'счетчик', 'слова', 'слово', 'подсчет', 'считай', 'количество', 'из', 'транскрипта', 'выводи', 'и', 'для', 'карточка'];
        const targetWords = words.filter(w => !skipWords.includes(w.toLowerCase()));
        if (targetWords.length > 0) {
          wordMatch = [targetWords[0], targetWords[0]];
        }
      }
    }

    if (wordMatch) {
      const targetWord = wordMatch[1].toLowerCase();
      console.log('✅ Extracted target word:', targetWord, 'from:', allText);
      countWord(targetWord);
    } else {
      console.log('❌ Could not extract word from:', allText);
      console.log('Available transcripts:', transcripts);
      setTargetWord("...");
      setCount(0);
    }

    function countWord(word: string) {
      console.log(`🔍 Starting to count word: "${word}"`);
      setTargetWord(word);

      // Count occurrences in all transcripts
      let totalCount = 0;
      transcripts.forEach((fragment, idx) => {
        console.log(`Fragment ${idx}:`, fragment.text);

        // Create regex to match word with any case and declensions
        // For words like "house", also match word variations and declensions
        // Escape special regex characters in the word
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Also try exact match and with declensions
        const regex = new RegExp(`(^|\\s|-)${escapedWord}([а-яёА-ЯЁ]{0,3})?($|\\s|-)`, 'gi');
        const matches = fragment.text.match(regex);
        console.log(`  Testing regex: /${regex.source}/${regex.flags} on text: "${fragment.text}"`);

        if (matches) {
          console.log(`  ✅ Found ${matches.length} matches:`, matches);
          totalCount += matches.length;
        } else {
          console.log(`  ❌ No matches found`);
        }
      });

      setCount(totalCount);
      console.log(`📊 Total count for "${word}": ${totalCount} occurrences in ${transcripts.length} transcripts`);
    }
  }, [transcripts, card.updateRule, card.prompt, card.content, card.title]);

  const handleChange = useCallback(
    (next: Partial<CardLayout>) => {
      const updated: CardLayout = {
        x: next.x ?? layout.x,
        y: next.y ?? layout.y,
        width: next.width ?? layout.width,
        height: next.height ?? layout.height,
        rotation: next.rotation ?? layout.rotation ?? null,
        zIndex: next.zIndex ?? layout.zIndex ?? null,
      };
      onLayoutChange(card.id, updated);
    },
    [card.id, layout, onLayoutChange],
  );

  return (
    <Rnd
      size={{ width: layout.width, height: layout.height }}
      position={{ x: layout.x, y: layout.y }}
      onDragStop={(_, data) => handleChange({ x: data.x, y: data.y })}
      onResizeStop={(_, __, ref, ___, position) =>
        handleChange({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y,
        })
      }
      bounds="parent"
      minWidth={200}
      minHeight={140}
      style={{ zIndex: layout.zIndex ?? 1 }}
      className="group"
    >
      <article className="flex h-full w-full flex-col rounded-3xl bg-gradient-to-br from-canvas-accent/20 to-canvas-accent/10 p-4 shadow-lg shadow-canvas-accent/20 backdrop-blur">
        <header className="flex items-center justify-between gap-2 pb-2">
          <h3 className="text-sm font-medium text-white/80">{card.title}</h3>
          <button
            onClick={() => onEdit(card)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white/60 hover:text-white"
          >
            ✏️
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-white mb-2">{count}</div>
            <div className="text-sm text-white/80 mb-1">
              {targetWord ? `"${targetWord}"` : "..."}
            </div>
            <div className="text-xs text-white/60">
              Word Counter
            </div>
          </div>
        </div>

        <footer className="text-xs text-white/40">
          Updated: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </footer>
      </article>
    </Rnd>
  );
}