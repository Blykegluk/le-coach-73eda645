import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


export type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Salut ! 👋 Je suis ton Perfect Coach. Comment puis-je t'aider aujourd'hui ? Tu peux me parler de tes repas, ton entraînement, tes objectifs, ou m'envoyer des photos de tes repas ou mesures !"
};

export function useCoachChat(onNavigateAway?: () => void) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollButton(scrollTop < scrollHeight - clientHeight - 80);
    }
  }, []);

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
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          imageUrl: msg.image_url || undefined,
        })));
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

  // Scroll to bottom when messages change or history finishes loading
  useEffect(() => {
    // Use multiple delays to catch both immediate renders and drawer animations
    const timers = [50, 150, 300, 500, 800, 1200].map(ms =>
      setTimeout(scrollToBottom, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [messages, isLoadingHistory, scrollToBottom]);

  /**
   * Get a valid user access token. Tries refreshSession first, falls back to getSession.
   * Returns null if no valid session exists.
   */
  const getAccessToken = async (): Promise<string | null> => {
    // Try refresh first to ensure fresh token
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (!error && session?.access_token) {
      return session.access_token;
    }
    // Fallback to existing session
    const { data: fallback } = await supabase.auth.getSession();
    return fallback.session?.access_token || null;
  };

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
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Session expirée, reconnecte-toi");
      }

      console.log("Sending coach-chat with token length:", accessToken.length);

      const response = await fetch(
        `https://ldllojtzoetwcwbjmfib.supabase.co/functions/v1/coach-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbGxvanR6b2V0d2N3YmptZmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4OTkzNzQsImV4cCI6MjA4NTQ3NTM3NH0.NAINuQt1vmut_ILrp-YFsrgRZYXx3nJmIZ77Alnn2sw',
          },
          body: JSON.stringify({
            messages: [...messages, { role: userMsg.role, content: userMsg.content }].map(m => ({
              role: m.role,
              content: m.content,
            })),
            imageUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || `Erreur ${response.status}`);
      }

      const data = await response.json();

      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: { name: string; result: { success: boolean; message: string; data?: { workout?: unknown; type?: string } } }) => {
          if (action.result.success) {
            toast.success(action.result.message);

            if (action.name === "generate_workout" && action.result.data?.workout) {
              // Workout is already saved to user_context by the edge function
              // Realtime subscriptions will pick it up automatically
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

  return {
    scrollRef,
    inputMessage,
    setInputMessage,
    userId,
    messages,
    isLoading,
    isLoadingHistory,
    showScrollButton,
    handleScroll,
    scrollToBottom,
    handleSend,
    handleImageCaptured,
    handleVoiceTranscription,
    handleSuggestion,
  };
}
