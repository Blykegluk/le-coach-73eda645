import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Send, Plus, Camera, Mic, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ImageCapture from '@/components/chat/ImageCapture';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useNavigate } from 'react-router-dom';

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

type Message = { 
  id?: string;
  role: "user" | "assistant"; 
  content: string;
  imageUrl?: string;
};

const WELCOME_MESSAGE: Message = { 
  role: "assistant", 
  content: "Salut ! 👋 Je suis ton Coach HealthLab. Comment puis-je t'aider aujourd'hui ? Tu peux me parler de tes repas, ton entraînement, tes objectifs, ou m'envoyer des photos de tes repas ou mesures !" 
};

const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
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
        // No history, show welcome message
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
    
    // Add message to UI immediately
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Save user message to database
    await saveMessage(userId, userMsg);

    try {
      // Call the edge function with tool calling support
      const response = await fetch(
        `https://ldllojtzoetwcwbjmfib.supabase.co/functions/v1/coach-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbGxvanR6b2V0d2N3YmptZmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4OTkzNzQsImV4cCI6MjA4NTQ3NTM3NH0.NAINuQt1vmut_ILrp-YFsrgRZYXx3nJmIZ77Alnn2sw`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: userMsg.role, content: userMsg.content }].map(m => ({
              role: m.role,
              content: m.content,
            })),
            userId,
            imageUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const data = await response.json();
      
      // Show toast for actions executed and handle special actions
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: { name: string; result: { success: boolean; message: string; data?: { workout?: unknown; type?: string } } }) => {
          if (action.result.success) {
            toast.success(action.result.message);
            
            // Check if a workout was generated
            if (action.name === "generate_workout" && action.result.data?.workout) {
              setGeneratedWorkout(action.result.data.workout as import('@/components/training/NextWorkoutCard').Workout);
              // Navigate to training page to show the generated workout
              setTimeout(() => {
                navigate('/training');
                onClose();
              }, 1500);
            }
          }
        });
      }

      const assistantMsg: Message = { role: "assistant", content: data.content };
      setMessages(prev => [...prev, assistantMsg]);
      
      // Save assistant message to database
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
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement de l'historique...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => {
              const isCoach = msg.role === 'assistant';
              return (
                <div key={msg.id || index} className={`flex gap-2 ${isCoach ? 'justify-start' : 'justify-end'}`}>
                  {isCoach && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      H
                    </div>
                  )}
                  <div className={`flex max-w-[75%] flex-col ${isCoach ? 'items-start' : 'items-end'}`}>
                    {/* Show image if present */}
                    {msg.imageUrl && (
                      <div className="mb-2 overflow-hidden rounded-xl">
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
                          ? 'rounded-tl-md bg-coach-bubble text-coach-bubble-foreground'
                          : 'rounded-tr-md bg-user-bubble text-user-bubble-foreground'
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
        )}
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
              <button 
                onClick={() => {
                  setShowActions(false);
                  setShowImageCapture(true);
                }}
                className="flex flex-col items-center gap-2 rounded-xl bg-muted p-4 transition-all active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Photo</span>
              </button>
              <button 
                onClick={() => {
                  setShowActions(false);
                  setShowVoiceRecorder(true);
                }}
                className="flex flex-col items-center gap-2 rounded-xl bg-muted p-4 transition-all active:scale-95"
              >
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

export default ChatModal;
