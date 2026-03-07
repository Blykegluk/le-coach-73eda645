import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


export type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  suggestedReplies?: string[];
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

      // Add Paris timestamp to each message for temporal context
      const formatParisTimestamp = (date: Date) => {
        return new Intl.DateTimeFormat("fr-FR", {
          timeZone: "Europe/Paris",
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);
      };

      const now = new Date();
      const messagesWithTimestamps = [...messages, { role: userMsg.role, content: userMsg.content }].map(m => ({
        role: m.role,
        content: m.content,
      }));
      // Tag the last user message with current timestamp
      const lastIdx = messagesWithTimestamps.length - 1;
      messagesWithTimestamps[lastIdx].content = `[${formatParisTimestamp(now)}] ${messagesWithTimestamps[lastIdx].content}`;

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
            messages: messagesWithTimestamps,
            imageUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || `Erreur ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulatedContent = "";
      let assistantAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const eventBlocks = sseBuffer.split("\n\n");
        sseBuffer = eventBlocks.pop() || "";

        for (const block of eventBlocks) {
          const eventMatch = block.match(/^event: (.+)/m);
          const dataMatch = block.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          let eventData: any;
          try { eventData = JSON.parse(dataMatch[1]); } catch { continue; }

          switch (eventType) {
            case "content_start":
              accumulatedContent = "";
              if (!assistantAdded) {
                setMessages(prev => [...prev, { role: "assistant", content: "" }]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: "" };
                  return updated;
                });
              }
              break;

            case "content_delta":
              accumulatedContent += eventData.text;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + eventData.text };
                return updated;
              });
              break;

            case "actions":
              if (Array.isArray(eventData)) {
                eventData.forEach((action: { name: string; result: { success: boolean; message: string; data?: { workout?: unknown } } }) => {
                  if (action.result.success) {
                    toast.success(action.result.message);
                  }
                });
              }
              break;

            case "suggested_replies":
              if (Array.isArray(eventData)) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], suggestedReplies: eventData };
                  return updated;
                });
              }
              break;

            case "error":
              throw new Error(eventData.message || "Erreur du coach");

            case "done":
              break;
          }
        }
      }

      // Save the complete assistant message
      if (accumulatedContent) {
        await saveMessage(userId, { role: "assistant", content: accumulatedContent });
      }

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
