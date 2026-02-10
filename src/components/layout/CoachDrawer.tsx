import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, Camera, Mic, Loader2, X, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ImageCapture from '@/components/chat/ImageCapture';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import { useCoachChat } from '@/hooks/useCoachChat';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

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

  // Robust scroll to bottom using anchor element
  const scrollToEnd = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);

  // Scroll to bottom when drawer opens or messages change
  useEffect(() => {
    if (!isOpen) return;
    // Multiple delays to catch drawer animation completion
    const timers = [0, 100, 300, 600, 1000].map(ms =>
      setTimeout(scrollToEnd, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [isOpen, messages, isLoadingHistory, scrollToEnd]);

  // Handle visual viewport resize (keyboard open/close)
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      // Force layout recalc - the dvh unit should handle it but we scroll to keep position
      setTimeout(scrollToEnd, 50);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [isOpen, scrollToEnd]);

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[85dvh] max-h-[85dvh] flex flex-col" style={{ height: '85dvh' }}>
          <DrawerHeader className="flex-shrink-0 border-b border-border/50 pb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow font-bold text-primary-foreground shadow-glow-sm">
                  H
                </div>
              </div>
              <div className="flex-1">
                <DrawerTitle className="text-left">Coach IA</DrawerTitle>
                <DrawerDescription className="text-left">
                  {isLoading ? "Réfléchit..." : "En ligne"}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

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
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex gap-2 ${isCoach ? 'justify-start' : 'justify-end'}`}
                    >
                      {isCoach && (
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-xs font-bold text-primary-foreground">
                          H
                        </div>
                      )}
                      <div className={`flex max-w-[80%] flex-col ${isCoach ? 'items-start' : 'items-end'}`}>
                        {msg.imageUrl && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-border/50">
                            <img src={msg.imageUrl} alt="Uploaded" className="max-h-32 w-auto object-cover" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm ${
                            isCoach
                              ? 'rounded-tl-md bg-muted/50'
                              : 'rounded-tr-md bg-gradient-to-r from-primary to-primary-glow text-primary-foreground'
                          }`}
                        >
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
                  );
                })}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-xs font-bold text-primary-foreground">
                      H
                    </div>
                    <div className="rounded-2xl rounded-tl-md bg-muted/50 px-3 py-2">
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
              className="absolute bottom-44 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border/50 shadow-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}

          {/* Actions overlay */}
          {showActions && (
            <div
              className="absolute inset-0 z-10 flex items-end bg-background/60 backdrop-blur-sm rounded-t-[10px]"
              onClick={() => setShowActions(false)}
            >
              <div
                className="mb-4 mx-4 w-full glass-card rounded-2xl p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Ajouter</h3>
                  <button onClick={() => setShowActions(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 hover:bg-muted">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setShowActions(false); setShowImageCapture(true); }} className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 hover:bg-muted">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Camera className="h-6 w-6 text-primary" /></div>
                    <span className="text-sm font-medium">Photo</span>
                  </button>
                  <button onClick={() => { setShowActions(false); setShowVoiceRecorder(true); }} className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 hover:bg-muted">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Mic className="h-6 w-6 text-primary" /></div>
                    <span className="text-sm font-medium">Vocal</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-border/50 px-4 pb-4 pt-3">
            <div className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto">
              {suggestions.map((s) => (
                <button key={s.label} onClick={() => handleSuggestion(s.label)} disabled={isLoading} className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-50">
                  <span>{s.emoji}</span><span>{s.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowActions(true)} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary">
                <Plus className="h-5 w-5" />
              </button>
              <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Message..." disabled={isLoading} className="h-10 flex-1 rounded-full border border-border/50 bg-card/50 px-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50" />
              <button onClick={() => handleSend()} disabled={!inputMessage.trim() || isLoading} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground disabled:opacity-50">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <ImageCapture isOpen={showImageCapture} onClose={() => setShowImageCapture(false)} onImageCaptured={handleImageCaptured} userId={userId} />
      <VoiceRecorder isOpen={showVoiceRecorder} onClose={() => setShowVoiceRecorder(false)} onTranscription={handleVoiceTranscription} />
    </>
  );
};

export default CoachDrawer;
