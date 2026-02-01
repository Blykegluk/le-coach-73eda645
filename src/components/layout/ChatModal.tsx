import { useRef, useEffect, useState } from 'react';
import { X, Send, Plus, Camera, Mic, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestions = [
  { emoji: '🍽️', label: 'Ajouter Repas' },
  { emoji: '📊', label: 'Mon Bilan' },
  { emoji: '💪', label: 'Séance' },
  { emoji: '💧', label: 'Eau' },
];

type Message = { role: "user" | "assistant"; content: string };

const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Salut ! 👋 Je suis ton Coach HealthLab. Comment puis-je t'aider aujourd'hui ? Tu peux me parler de tes repas, ton entraînement ou tes objectifs !" 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || inputMessage.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the edge function with tool calling support
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMsg].map(m => ({
              role: m.role,
              content: m.content,
            })),
            userId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const data = await response.json();
      
      // Show toast for actions executed
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: { name: string; result: { success: boolean; message: string } }) => {
          if (action.result.success) {
            toast.success(action.result.message);
          }
        });
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);

    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur de connexion");
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Désolé, je rencontre un problème technique. Réessaie dans un instant ! 🔧" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (label: string) => {
    const suggestionMessages: Record<string, string> = {
      'Ajouter Repas': "Je viens de manger, aide-moi à le noter",
      'Mon Bilan': "Donne-moi un résumé de ma journée",
      'Séance': "Propose-moi une séance d'entraînement",
      'Eau': "J'ai bu un verre d'eau",
    };
    handleSend(suggestionMessages[label] || label);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="safe-top flex items-center justify-between border-b border-border bg-card px-4 pb-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
            H
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Coach IA</h2>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Réfléchit..." : userId ? "Connecté" : "Mode démo"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => {
            const isCoach = msg.role === 'assistant';
            return (
              <div key={index} className={`flex gap-2 ${isCoach ? 'justify-start' : 'justify-end'}`}>
                {isCoach && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    H
                  </div>
                )}
                <div className={`flex max-w-[75%] flex-col ${isCoach ? 'items-start' : 'items-end'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      isCoach
                        ? 'rounded-tl-md bg-coach-bubble text-coach-bubble-foreground'
                        : 'rounded-tr-md bg-user-bubble text-user-bubble-foreground'
                    }`}
                  >
                    {isCoach ? (
                      <div className="prose prose-sm max-w-none text-sm leading-relaxed text-inherit prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                H
              </div>
              <div className="rounded-2xl rounded-tl-md bg-coach-bubble px-4 py-2.5">
                <Loader2 className="h-5 w-5 animate-spin text-coach-bubble-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions modal */}
      {showActions && (
        <div 
          className="absolute inset-0 z-10 flex items-end bg-foreground/20 backdrop-blur-sm"
          onClick={() => setShowActions(false)}
        >
          <div 
            className="mb-4 mx-4 w-full animate-in slide-in-from-bottom-4 rounded-2xl bg-card p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Ajouter</h3>
              <button 
                onClick={() => setShowActions(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 rounded-xl bg-muted p-4 transition-all active:scale-95">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Photo repas</span>
              </button>
              <button className="flex flex-col items-center gap-2 rounded-xl bg-muted p-4 transition-all active:scale-95">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Message vocal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="safe-bottom border-t border-border bg-card px-4 pb-2 pt-3">
        {/* Suggestions */}
        <div className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s.label)}
              disabled={isLoading}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:border-primary active:scale-95 disabled:opacity-50"
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActions(true)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message à ton coach..."
            disabled={isLoading}
            className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || isLoading}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
