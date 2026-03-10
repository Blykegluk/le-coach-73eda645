import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, Camera, Mic, Loader2, X, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ImageCapture from '@/components/chat/ImageCapture';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import SuggestedReplies from '@/components/chat/SuggestedReplies';
import { useCoachChat } from '@/hooks/useCoachChat';

const suggestions = [
  { emoji: '🍽️', label: 'Ajouter Repas' },
  { emoji: '📊', label: 'Mon Bilan' },
  { emoji: '💪', label: 'Séance' },
  { emoji: '💧', label: 'Eau' },
];

interface CoachDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CoachDrawer = ({ isOpen, onClose }: CoachDrawerProps) => {
  const [showActions, setShowActions] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const scrollToEnd = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);

  // Scroll to bottom when drawer opens or messages change
  useEffect(() => {
    if (!isOpen) return;
    const timers = [0, 100, 300, 500].map(ms =>
      setTimeout(scrollToEnd, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [isOpen, messages, isLoadingHistory, scrollToEnd]);

  if (!isOpen) return (
    <>
      <ImageCapture isOpen={showImageCapture} onClose={() => setShowImageCapture(false)} onImageCaptured={handleImageCaptured} userId={userId} />
      <VoiceRecorder isOpen={showVoiceRecorder} onClose={() => setShowVoiceRecorder(false)} onTranscription={handleVoiceTranscription} />
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background rounded-t-2xl border-t border-border/50" style={{ height: '85vh' }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 border-b border-border/50 px-4 pb-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Coach" className="h-10 w-10 rounded-full object-cover" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold leading-none">Perfect Coach</h2>
              <p className="text-sm text-muted-foreground">{isLoading ? "Réfléchit..." : "En ligne"}</p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 min-h-0">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, index) => {
                const isCoach = msg.role === 'assistant';
                const isLastAssistant = isCoach && !isLoading && messages.slice(index + 1).every(m => m.role !== 'assistant');
                return (
                  <div key={msg.id || index}>
                    <div className={`flex gap-2 ${isCoach ? 'justify-start' : 'justify-end'}`}>
                      {isCoach && (
                        <img src="/logo.png" alt="Coach" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
                      )}
                      <div className={`flex max-w-[80%] flex-col ${isCoach ? 'items-start' : 'items-end'}`}>
                        {msg.imageUrl && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-border/50">
                            <img src={msg.imageUrl} alt="Uploaded" className="max-h-32 w-auto object-cover" />
                          </div>
                        )}
                        <div className={`rounded-2xl px-3 py-2 text-sm ${isCoach ? 'rounded-tl-md bg-muted/50' : 'rounded-tr-md bg-gradient-to-r from-primary to-primary-glow text-primary-foreground'}`}>
                          {isCoach ? (
                            <div className="coach-message-content text-sm">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {isLastAssistant && (
                      <div className="mt-2 ml-9">
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
                   <img src="/logo.png" alt="Coach" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
                  <div className="rounded-2xl rounded-tl-md bg-muted/50 px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button onClick={scrollToEnd} className="absolute bottom-44 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border/50 shadow-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <ArrowDown className="h-4 w-4" />
          </button>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-border/50 px-4 pb-[env(safe-area-inset-bottom,8px)] pt-3">
          <div className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto">
            {suggestions.map((s) => (
              <button key={s.label} onClick={() => handleSuggestion(s.label)} disabled={isLoading} className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-50">
                <span>{s.emoji}</span><span>{s.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => setShowActions(true)} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary">
              <Plus className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                // Auto-resize
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                  // Reset height after send
                  if (textareaRef.current) {
                    textareaRef.current.style.height = '40px';
                  }
                }
              }}
              placeholder="Message..."
              disabled={isLoading}
              rows={1}
              className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-2xl border border-border/50 bg-card/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button onClick={() => { handleSend(); if (textareaRef.current) textareaRef.current.style.height = '40px'; }} disabled={!inputMessage.trim() || isLoading} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground disabled:opacity-50">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Action menu overlay */}
      {showActions && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setShowActions(false)}>
          <div className="mb-24 mx-4 w-full max-w-sm rounded-2xl bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowActions(false); setShowImageCapture(true); }}
                className="flex flex-1 flex-col items-center gap-2 rounded-xl bg-muted p-4 text-foreground transition-all hover:bg-muted/80 active:scale-95"
              >
                <Camera className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Photo</span>
              </button>
              <button
                onClick={() => { setShowActions(false); setShowVoiceRecorder(true); }}
                className="flex flex-1 flex-col items-center gap-2 rounded-xl bg-muted p-4 text-foreground transition-all hover:bg-muted/80 active:scale-95"
              >
                <Mic className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Vocal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageCapture isOpen={showImageCapture} onClose={() => setShowImageCapture(false)} onImageCaptured={handleImageCaptured} userId={userId} />
      <VoiceRecorder isOpen={showVoiceRecorder} onClose={() => setShowVoiceRecorder(false)} onTranscription={handleVoiceTranscription} />
    </>
  );
};

export default CoachDrawer;
