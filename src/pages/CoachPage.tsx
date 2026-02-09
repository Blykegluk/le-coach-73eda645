import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Plus, Camera, Mic, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ImageCapture from '@/components/chat/ImageCapture';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useNavigate } from 'react-router-dom';

const suggestions = [
  { emoji: '🍽️', label: 'Ajouter Repas' },
  { emoji: '📊', label: 'Mon Bilan' },
  { emoji: '💪', label: 'Séance' },
  { emoji: '💧', label: 'Eau' },
];

type Message = { 
  id?: string;
  role: "user" | "assistant"; 
  content: string;
  imageUrl?: string;
};

const WELCOME_MESSAGE: Message = { 
  role: "assistant", 
  content: "Salut ! 👋 Je suis ton Perfect Coach. Comment puis-je t'aider aujourd'hui ? Tu peux me parler de tes repas, ton entraînement, tes objectifs, ou m'envoyer des photos de tes repas ou mesures !" 
};

const CoachPage = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { setGeneratedWorkout } = useWorkout();
  const navigate = useNavigate();

  // Load chat history from database
  const loadChatHistory = useCallback(async (uid: string) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, image_url, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          imageUrl: msg.image_url || undefined,
        }));
        setMessages(loadedMessages);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([WELCOME_MESSAGE]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Save a message to database
  const saveMessage = useCallback(async (uid: string, message: Message) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: uid,
          role: message.role,
          content: message.content,
          image_url: message.imageUrl || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }, []);

  // Get current user and load history
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setUserId(user.id);
        loadChatHistory(user.id);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        loadChatHistory(uid);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadChatHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string, imageUrl?: string) => {
    const messageText = text || inputMessage.trim();
    if ((!messageText && !imageUrl) || isLoading || !userId) return;

    const userMsg: Message = { 
      role: "user", 
      content: messageText || (imageUrl ? "Analyse cette image" : ""),
      imageUrl 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    await saveMessage(userId, userMsg);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('coach-chat', {
        body: {
          messages: [...messages, { role: userMsg.role, content: userMsg.content }].map(m => ({
            role: m.role,
            content: m.content,
          })),
          imageUrl,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || `Erreur de connexion`);
      }
      
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: { name: string; result: { success: boolean; message: string; data?: { workout?: unknown; type?: string } } }) => {
          if (action.result.success) {
            toast.success(action.result.message);
            
            if (action.name === "generate_workout" && action.result.data?.workout) {
              setGeneratedWorkout(action.result.data.workout as import('@/components/training/NextWorkoutCard').Workout);
              setTimeout(() => {
                navigate('/training');
              }, 1500);
            }
          }
        });
      }

      const assistantMsg: Message = { role: "assistant", content: data.content };
      setMessages(prev => [...prev, assistantMsg]);
      
      await saveMessage(userId, assistantMsg);

    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur de connexion");
      
      const errorMsg: Message = { 
        role: "assistant", 
        content: "Désolé, je rencontre un problème technique. Réessaie dans un instant ! 🔧" 
      };
      setMessages(prev => [...prev, errorMsg]);
      await saveMessage(userId, errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageCaptured = (imageUrl: string) => {
    handleSend("Analyse cette image", imageUrl);
  };

  const handleVoiceTranscription = (text: string) => {
    handleSend(text);
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

  return (
    <div className="flex h-full flex-col bg-gradient-glow">
      {/* Header */}
      <header className="safe-top flex items-center gap-3 border-b border-border/50 glass px-4 pb-4 pt-2">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow font-bold text-primary-foreground shadow-glow-sm">
            H
          </div>
          <div className="absolute inset-0 rounded-full animate-halo-pulse" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Coach IA</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Réfléchit..." : userId ? "Connecté" : "Mode démo"}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement de l'historique...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => {
              const isCoach = msg.role === 'assistant';
              return (
                <div 
                  key={msg.id || index} 
                  className={`flex gap-2 ${isCoach ? 'justify-start' : 'justify-end'} animate-slide-up`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {isCoach && (
                    <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-sm font-bold text-primary-foreground shadow-glow-sm">
                      H
                    </div>
                  )}
                  <div className={`flex max-w-[75%] flex-col ${isCoach ? 'items-start' : 'items-end'}`}>
                    {msg.imageUrl && (
                      <div className="mb-2 overflow-hidden rounded-xl border border-border/50 shadow-lg">
                        <img 
                          src={msg.imageUrl} 
                          alt="Uploaded" 
                          className="max-h-48 w-auto object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        isCoach
                          ? 'rounded-tl-md glass'
                          : 'rounded-tr-md bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow-sm'
                      }`}
                    >
                    {isCoach ? (
                        <div className="coach-message-content">
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
              <div className="flex gap-2 justify-start animate-fade-in">
                <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-sm font-bold text-primary-foreground">
                  H
                </div>
                <div className="rounded-2xl rounded-tl-md glass px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0s' }} />
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions modal */}
      {showActions && (
        <div 
          className="absolute inset-0 z-10 flex items-end bg-background/60 backdrop-blur-sm"
          onClick={() => setShowActions(false)}
        >
          <div 
            className="mb-4 mx-4 w-full animate-slide-up glass-card rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Ajouter</h3>
              <button 
                onClick={() => setShowActions(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setShowActions(false);
                  setShowImageCapture(true);
                }}
                className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-all hover:bg-muted active:scale-95 group"
              >
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Camera className="h-6 w-6 text-primary" />
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-sm font-medium text-foreground">Photo</span>
              </button>
              <button 
                onClick={() => {
                  setShowActions(false);
                  setShowVoiceRecorder(true);
                }}
                className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-all hover:bg-muted active:scale-95 group"
              >
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Mic className="h-6 w-6 text-primary" />
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-sm font-medium text-foreground">Message vocal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border/50 glass px-4 pb-2 pt-3">
        {/* Suggestions */}
        <div className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s.label)}
              disabled={isLoading}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:border-primary hover:shadow-glow-sm active:scale-95 disabled:opacity-50"
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
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:shadow-glow-sm active:scale-95"
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
            className="h-10 flex-1 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-glow-sm disabled:opacity-50 transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || isLoading}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow-sm transition-all hover:shadow-glow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Image Capture Modal */}
      <ImageCapture
        isOpen={showImageCapture}
        onClose={() => setShowImageCapture(false)}
        onImageCaptured={handleImageCaptured}
        userId={userId}
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorder
        isOpen={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onTranscription={handleVoiceTranscription}
      />
    </div>
  );
};

export default CoachPage;
