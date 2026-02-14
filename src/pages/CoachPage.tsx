import { useState } from 'react';
import { Send, Plus, Camera, Mic, Loader2, X } from 'lucide-react';
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

const CoachPage = () => {
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
  } = useCoachChat();

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
              const isLastAssistant = isCoach && !isLoading && messages.slice(index + 1).every(m => m.role !== 'assistant');
              return (
                <div key={msg.id || index}>
                  <div
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
                          <img src={msg.imageUrl} alt="Uploaded" className="max-h-48 w-auto object-cover" />
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${isCoach ? 'rounded-tl-md glass' : 'rounded-tr-md bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow-sm'}`}>
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
                        lastAssistantMessage={msg.content}
                        onReply={(text) => handleSend(text)}
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex gap-2 justify-start animate-fade-in">
                <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-sm font-bold text-primary-foreground">H</div>
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
        <div className="absolute inset-0 z-10 flex items-end bg-background/60 backdrop-blur-sm" onClick={() => setShowActions(false)}>
          <div className="mb-4 mx-4 w-full animate-slide-up glass-card rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Ajouter</h3>
              <button onClick={() => setShowActions(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowActions(false); setShowImageCapture(true); }} className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-all hover:bg-muted active:scale-95 group">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Photo</span>
              </button>
              <button onClick={() => { setShowActions(false); setShowVoiceRecorder(true); }} className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-all hover:bg-muted active:scale-95 group">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Message vocal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border/50 glass px-4 pb-2 pt-3">
        <div className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto">
          {suggestions.map((s) => (
            <button key={s.label} onClick={() => handleSuggestion(s.label)} disabled={isLoading} className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:border-primary hover:shadow-glow-sm active:scale-95 disabled:opacity-50">
              <span>{s.emoji}</span><span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowActions(true)} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:shadow-glow-sm active:scale-95">
            <Plus className="h-5 w-5" />
          </button>
          <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Message à ton coach..." disabled={isLoading} className="h-10 flex-1 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-glow-sm disabled:opacity-50 transition-all" />
          <button onClick={() => handleSend()} disabled={!inputMessage.trim() || isLoading} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow-sm transition-all hover:shadow-glow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <ImageCapture isOpen={showImageCapture} onClose={() => setShowImageCapture(false)} onImageCaptured={handleImageCaptured} userId={userId} />
      <VoiceRecorder isOpen={showVoiceRecorder} onClose={() => setShowVoiceRecorder(false)} onTranscription={handleVoiceTranscription} />
    </div>
  );
};

export default CoachPage;
