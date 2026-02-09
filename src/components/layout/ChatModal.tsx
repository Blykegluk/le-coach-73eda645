import { useState } from 'react';
import { X, Send, Plus, Camera, Mic, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ImageCapture from '@/components/chat/ImageCapture';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
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
              );
            })}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">H</div>
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
        <div className="absolute inset-0 z-10 flex items-end bg-foreground/20 backdrop-blur-sm" onClick={() => setShowActions(false)}>
          <div className="mb-4 mx-4 w-full animate-in slide-in-from-bottom-4 rounded-2xl bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Ajouter</h3>
              <button onClick={() => setShowActions(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowActions(false); setShowImageCapture(true); }} className="flex flex-col items-center gap-2 rounded-xl bg-muted p-4 transition-all active:scale-95">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Camera className="h-6 w-6 text-primary" /></div>
                <span className="text-sm font-medium text-foreground">Photo</span>
              </button>
              <button onClick={() => { setShowActions(false); setShowVoiceRecorder(true); }} className="flex flex-col items-center gap-2 rounded-xl bg-muted p-4 transition-all active:scale-95">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Mic className="h-6 w-6 text-primary" /></div>
                <span className="text-sm font-medium text-foreground">Message vocal</span>
              </button>
            </div>
          </div>
        </div>
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
