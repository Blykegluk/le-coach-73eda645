import { useMemo } from 'react';

interface SuggestedRepliesProps {
  lastAssistantMessage: string | undefined;
  onReply: (text: string) => void;
  disabled?: boolean;
}

/**
 * Generates contextual reply suggestions based on the last assistant question.
 * Only looks for explicit choice options AFTER the last question line.
 * Falls back to contextual suggestions based on question topic.
 */
function extractSuggestions(content: string | undefined): string[] {
  if (!content) return [];

  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  // Find the LAST line containing a question mark
  let lastQuestionIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('?')) {
      lastQuestionIndex = i;
      break;
    }
  }

  // Only consider questions near the end (last 5 lines)
  if (lastQuestionIndex < 0 || lastQuestionIndex < lines.length - 5) return [];

  const questionLine = lines[lastQuestionIndex];

  // Only extract numbered/bullet options that appear AFTER the question
  const linesAfterQuestion = lines.slice(lastQuestionIndex + 1);
  const optionPattern = /^(?:\d+[\.\)]\s*|[-•]\s*|[*]\s*)(.+)/;

  const options: string[] = [];
  for (const line of linesAfterQuestion) {
    const match = line.match(optionPattern);
    if (match) {
      const text = match[1].replace(/\*+/g, '').trim();
      if (text.length > 2 && text.length < 80) options.push(text);
    }
  }

  if (options.length >= 2 && options.length <= 6) return options;

  // Fallback: contextual replies based on question topic
  const q = questionLine;

  if (/(?:tu veux|on y va|je l['']ajoute|c['']est bon|ça te va|d['']accord|ok pour toi|je confirme|tu confirmes|je le fais|on commence|je te propose|ça te tente|tu préfères|on part|je lance)/i.test(q)) {
    return ['Oui, vas-y ! 💪', 'Non, pas maintenant'];
  }

  if (/comment (?:te sens|tu te sens|vas|tu vas|ça va)|qu['']en (?:penses|dis)|ton avis|ça te (?:convient|plaît|parle)/i.test(q)) {
    return ['Très bien, merci ! 💪', 'Ça pourrait être mieux', 'J\'ai une question'];
  }

  if (/(?:séance|entraînement|sport|exercice|activité|workout|musculation)/i.test(q)) {
    return ['Oui, j\'ai fait ma séance !', 'Pas encore', 'Propose-moi une séance'];
  }

  if (/(?:mangé|repas|dîner|souper|goûter|snack|collation|nutrition)/i.test(q)) {
    return ['Oui, je vais le noter', 'Pas encore mangé', 'Propose-moi un repas'];
  }

  return ['Oui 👍', 'Non merci', 'Dis-moi en plus'];
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
