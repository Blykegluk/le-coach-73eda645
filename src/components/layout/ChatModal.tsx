import { useState } from 'react';
import { X, Send, Plus, Camera, Mic, Loader2, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ImageCapture from '@/components/chat/ImageCapture';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import SuggestedReplies from '@/components/chat/SuggestedReplies';
import { useCoachChat } from '@/hooks/useCoachChat';

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

const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  const [showActions, setShowActions] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const {
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
  } = useCoachChat(onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="safe-top flex items-center justify-between border-b border-border bg-card px-4 pb-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">H</div>
          <div>
            <h2 className="font-semibold text-foreground">Coach IA</h2>
            <p className="text-xs text-muted-foreground">{isLoading ? "Réfléchit..." : userId ? "Connecté" : "Mode démo"}</p>
          </div>
        </div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80">
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement de l'historique...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => {
              const isCoach = msg.role === 'assistant';
              const isLastAssistant = isCoach && !isLoading && messages.slice(index + 1).every(m => m.role !== 'assistant');
              return (
                <div key={msg.id || index}>
                  <div className={`flex gap-2 ${isCoach ? 'justify-start' : 'justify-end'}`}>
                    {isCoach && (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">H</div>
                    )}
                    <div className={`flex max-w-[75%] flex-col ${isCoach ? 'items-start' : 'items-end'}`}>
                      {msg.imageUrl && (
                        <div className="mb-2 overflow-hidden rounded-xl">
                          <img src={msg.imageUrl} alt="Uploaded" className="max-h-48 w-auto object-cover" />
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${isCoach ? 'rounded-tl-md bg-coach-bubble text-coach-bubble-foreground' : 'rounded-tr-md bg-user-bubble text-user-bubble-foreground'}`}>
                        {isCoach ? (
                          <div className="coach-message-content"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {isLastAssistant && (
                    <div className="mt-2 ml-10">
                      <SuggestedReplies
                        suggestions={msg.suggestedReplies || []}
                        onReply={(text) => handleSend(text)}
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">H</div>
                <div className="rounded-2xl rounded-tl-md bg-coach-bubble px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-32 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border/50 shadow-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Input area */}
      <div className="safe-bottom border-t border-border bg-card px-4 pb-2 pt-3">
        <div className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto">
          {suggestions.map((s) => (
            <button key={s.label} onClick={() => handleSuggestion(s.label)} disabled={isLoading} className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:border-primary active:scale-95 disabled:opacity-50">
              <span>{s.emoji}</span><span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <button onClick={() => setShowActions(true)} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95">
            <Plus className="h-5 w-5" />
          </button>
          <textarea value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Message à ton coach..." disabled={isLoading} rows={1} className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" style={{ height: 'auto' }} onInput={(e) => { const target = e.target as HTMLTextAreaElement; target.style.height = 'auto'; target.style.height = Math.min(target.scrollHeight, 128) + 'px'; }} />
          <button onClick={() => handleSend()} disabled={!inputMessage.trim() || isLoading} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <ImageCapture isOpen={showImageCapture} onClose={() => setShowImageCapture(false)} onImageCaptured={handleImageCaptured} userId={userId} />
      <VoiceRecorder isOpen={showVoiceRecorder} onClose={() => setShowVoiceRecorder(false)} onTranscription={handleVoiceTranscription} />
    </div>
  );
};

export default ChatModal;
