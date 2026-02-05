import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ValidatedGoal {
  validated: boolean;
  goal_code: string;
  goal_label: string;
  target_weight?: number;
  current_body_fat_pct?: number;
  target_body_fat_pct?: number;
}

interface GoalAssistantProps {
  userContext?: {
    weight?: number;
    height?: number;
    activity_level?: string;
  };
  onGoalValidated: (
    goalCode: string,
    goalLabel: string,
    targetWeight?: number,
    currentBodyFatPct?: number,
    targetBodyFatPct?: number
  ) => void;
  suggestions: Array<{ value: string; label: string; emoji: string; description?: string }>;
  selectedGoal?: string;
  onSuggestionSelect: (value: string) => void;
}

export default function GoalAssistant({
  userContext,
  onGoalValidated,
  suggestions,
  selectedGoal,
  onSuggestionSelect,
}: GoalAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validatedGoal, setValidatedGoal] = useState<ValidatedGoal | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('goal-assistant', {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userContext,
        },
      });

      if (error) throw error;

      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      }

      if (data.validatedGoal?.validated) {
        setValidatedGoal(data.validatedGoal);
        onGoalValidated(
          data.validatedGoal.goal_code,
          data.validatedGoal.goal_label,
          data.validatedGoal.target_weight,
          data.validatedGoal.current_body_fat_pct,
          data.validatedGoal.target_body_fat_pct
        );
      }
    } catch (err) {
      console.error('Goal assistant error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Désolé, j'ai eu un souci. Réessaie ou choisis une suggestion ci-dessus !" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="space-y-4">
      {/* Quick suggestions */}
      <div className="space-y-2">
        {suggestions.map(goal => (
          <button
            key={goal.value}
            type="button"
            onClick={() => {
              onSuggestionSelect(goal.value);
              setValidatedGoal(null);
              setShowChat(false);
            }}
            className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border p-4 text-left transition-all ${
              selectedGoal === goal.value && !validatedGoal
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <span className="text-2xl">{goal.emoji}</span>
            <div className="flex-1">
              <p className="font-medium text-foreground">{goal.label}</p>
              {goal.description && (
                <p className="text-xs text-muted-foreground">{goal.description}</p>
              )}
            </div>
            {selectedGoal === goal.value && !validatedGoal && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Custom goal section */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <button
            type="button"
            onClick={() => setShowChat(!showChat)}
            className="bg-background px-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {showChat ? "Masquer l'assistant" : "Ou décris ton objectif à l'IA"}
          </button>
        </div>
      </div>

      {/* AI Chat interface */}
      {showChat && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Chat messages */}
          <div className="max-h-48 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Décris ton objectif en quelques mots, je t'aide à le préciser ! 💪
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Validated goal indicator */}
          {validatedGoal && (
            <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 px-3 py-2">
              <Check className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Objectif défini :</p>
                <p className="text-sm text-primary">{validatedGoal.goal_label}</p>
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ex: Je veux courir un semi-marathon..."
                disabled={isLoading || !!validatedGoal}
                className="flex-1"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || !!validatedGoal}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50 transition-all hover:bg-primary/90"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
