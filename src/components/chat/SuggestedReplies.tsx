interface SuggestedRepliesProps {
  suggestions: string[];
  onReply: (text: string) => void;
  disabled?: boolean;
}

const SuggestedReplies = ({ suggestions, onReply, disabled }: SuggestedRepliesProps) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
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
