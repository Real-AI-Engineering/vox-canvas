import { useEffect, useCallback, useRef } from "react";
import { useSessionStore } from "../state/sessionStore";
import type { SessionCard, TranscriptFragment } from "../types/session";

interface CardUpdateManagerProps {
  onCardUpdate?: (card: SessionCard, newContent: string) => void;
}

export function CardUpdateManager({ onCardUpdate }: CardUpdateManagerProps) {
  const { cards, transcripts } = useSessionStore();
  const lastUpdateRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const shouldUpdateCard = useCallback((card: SessionCard, latestTranscripts: TranscriptFragment[]) => {
    if (!card.autoUpdate) return false;

    // Check refresh interval
    if (card.refreshInterval) {
      const now = Date.now();
      const lastUpdate = card.updatedAt ? new Date(card.updatedAt).getTime() : new Date(card.createdAt).getTime();
      if (now - lastUpdate < card.refreshInterval * 1000) {
        return false;
      }
    }

    // Check update conditions
    if (card.updateConditions && card.updateConditions.length > 0) {
      const recentText = latestTranscripts
        .slice(-5)
        .map(t => t.text.toLowerCase())
        .join(' ');

      return card.updateConditions.some(condition =>
        recentText.includes(condition.toLowerCase())
      );
    }

    // Default: update if there are new transcripts
    return latestTranscripts.length > 0;
  }, []);

  const updateCard = useCallback(async (card: SessionCard, context: string) => {
    try {
      let prompt = card.prompt;

      // Customize prompt based on card type
      switch (card.type) {
        case "summary":
          prompt = card.prompt || "Create a brief summary of the main topics from the context. Highlight key points and decisions.";
          break;
        case "keywords":
          prompt = "Extract 5-10 keywords from the context. Format as a list of tags.";
          break;
        case "sentiment":
          prompt = "Analyze the sentiment and mood in the context. Determine the overall emotional tone.";
          break;
        case "counter":
          // Counter cards update differently via their own component
          return;
        default:
          prompt = card.prompt || "Update the card content based on the new context.";
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context,
          type: card.type,
          system_prompt: card.systemPrompt
        })
      });

      if (response.ok) {
        const result = await response.json();
        const newContent = result.contentMarkdown || result.content || "";

        if (onCardUpdate) {
          onCardUpdate(card, newContent);
        }

        // Update card via API
        await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/cards/${card.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: card.prompt,
            context,
            type: card.type,
            update_rule: card.updateRule,
            system_prompt: card.systemPrompt,
            refresh_interval: card.refreshInterval,
            data_source: card.dataSource,
            auto_update: card.autoUpdate,
            update_conditions: card.updateConditions || []
          })
        });
      }
    } catch (error) {
      console.error(`Failed to update card ${card.id}:`, error);
    }
  }, [onCardUpdate]);

  const processUpdates = useCallback(() => {
    if (transcripts.length === 0) return;

    const latestTranscripts = transcripts.slice(lastUpdateRef.current);
    if (latestTranscripts.length === 0) return;

    const context = latestTranscripts.map(t => t.text).join(' ');

    cards.forEach(card => {
      if (shouldUpdateCard(card, latestTranscripts)) {
        updateCard(card, context);
      }
    });

    lastUpdateRef.current = transcripts.length;
  }, [cards, transcripts, shouldUpdateCard, updateCard]);

  useEffect(() => {
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates to avoid too frequent calls
    updateTimeoutRef.current = setTimeout(processUpdates, 2000);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [processUpdates]);

  // Component doesn't render anything visible
  return null;
}