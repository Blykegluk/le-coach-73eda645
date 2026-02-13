import { useMemo } from 'react';

interface SuggestedRepliesProps {
  lastAssistantMessage: string | undefined;
  onReply: (text: string) => void;
  disabled?: boolean;
}

/**
 * Parses the last assistant message to extract suggested replies.
 * Detects:
 * - Numbered lists (1. Option, 2. Option)
 * - Bullet lists (- Option, • Option)
 * - Emoji-prefixed options (🏋️ Option)
 * - Yes/No questions
 */
function extractSuggestions(content: string | undefined): string[] {
  if (!content) return [];

  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  // Check if the message ends with a question (last meaningful line has ?)
  const lastLines = lines.slice(-5);
  const hasQuestion = lastLines.some(l => l.endsWith('?'));
  if (!hasQuestion) return [];

  // Try to extract numbered/bullet options
  const optionPattern = /^(?:\d+[\.\)]\s*|[-•]\s*|[*]\s*)(.+)/;
  const emojiPattern = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*(.+)/u;

  const options: string[] = [];

  for (const line of lines) {
    const optionMatch = line.match(optionPattern);
    if (optionMatch) {
      let text = optionMatch[1].trim();
      // Remove trailing markdown bold/italic
      text = text.replace(/\*+/g, '').trim();
      if (text.length > 2 && text.length < 80) {
        options.push(text);
      }
      continue;
    }

    const emojiMatch = line.match(emojiPattern);
    if (emojiMatch) {
      const text = emojiMatch[2].replace(/\*+/g, '').trim();
      if (text.length > 2 && text.length < 80) {
        options.push(text);
      }
    }
  }

  if (options.length >= 2 && options.length <= 6) {
    return options;
  }

  // Fallback: if it's a yes/no or open question
  const questionLine = lastLines.find(l => l.endsWith('?'));
  if (questionLine) {
    const yesNoPatterns = [
      /(?:tu veux|on y va|je l['']ajoute|c['']est bon|ça te va|d['']accord|ok pour toi|je confirme|tu confirmes|je le fais)/i,
    ];
    if (yesNoPatterns.some(p => p.test(questionLine))) {
      return ['Oui, vas-y !', 'Non, pas maintenant'];
    }

    // Feeling / sentiment questions
    const feelingPatterns = [
      /comment (?:te sens|tu te sens|vas|tu vas|ça va)/i,
      /qu['']en (?:penses|dis)/i,
      /ton avis/i,
      /ça te (?:convient|plaît|parle)/i,
    ];
    if (feelingPatterns.some(p => p.test(questionLine))) {
      return ['Très bien, merci ! 💪', 'Ça pourrait être mieux', 'J\'ai une question'];
    }

    // Workout / activity questions
    const workoutPatterns = [
      /(?:séance|entraînement|sport|exercice|activité)/i,
      /(?:fait|fais) (?:du sport|ta séance)/i,
    ];
    if (workoutPatterns.some(p => p.test(questionLine))) {
      return ['Oui, j\'ai fait ma séance !', 'Pas encore', 'Propose-moi une séance'];
    }

    // Meal / nutrition questions
    const mealPatterns = [
      /(?:mangé|repas|dîner|souper|goûter|snack|collation)/i,
    ];
    if (mealPatterns.some(p => p.test(questionLine))) {
      return ['Oui, je vais le noter', 'Pas encore mangé', 'Propose-moi un repas'];
    }

    // Generic question - offer contextual replies
    return ['Oui 👍', 'Non merci', 'Dis-moi en plus'];
  }

  return [];
}

const SuggestedReplies = ({ lastAssistantMessage, onReply, disabled }: SuggestedRepliesProps) => {
  const suggestions = useMemo(() => extractSuggestions(lastAssistantMessage), [lastAssistantMessage]);

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onReply(suggestion)}
          disabled={disabled}
          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/50 active:scale-95 disabled:opacity-50"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default SuggestedReplies;
