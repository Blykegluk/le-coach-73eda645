import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, X, Check, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscription: (text: string) => void;
}

export default function VoiceRecorder({ isOpen, onClose, onTranscription }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'sent' | 'error'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const sentRef = useRef(false);
  const onTranscriptionRef = useRef(onTranscription);
  const onCloseRef = useRef(onClose);

  // Keep refs up to date
  useEffect(() => {
    onTranscriptionRef.current = onTranscription;
    onCloseRef.current = onClose;
  }, [onTranscription, onClose]);

  const hasSpeechRecognition = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setTranscript('');
      setRecordingTime(0);
      sentRef.current = false;
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
    }
  }, [isOpen]);

  const stopMediaTracks = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const doSend = useCallback(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    // Use final transcript, fall back to interim
    let text = finalTranscriptRef.current.trim();
    if (!text) text = interimTranscriptRef.current.trim();

    console.log('[VoiceRecorder] doSend called, text:', JSON.stringify(text));

    stopMediaTracks();

    if (text) {
      onTranscriptionRef.current(text);
      // Show "sent" confirmation briefly, then auto-close
      setStatus('sent');
      setTimeout(() => {
        onCloseRef.current();
      }, 600);
    } else {
      // No text detected — show error, let user retry or close
      setStatus('error');
      setIsRecording(false);
      setRecordingTime(0);
    }

    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
  }, [stopMediaTracks]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setIsRecording(true);
      setStatus('recording');
      setRecordingTime(0);
      setTranscript('');
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      sentRef.current = false;

      if (hasSpeechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; 0: { transcript: string } } } }) => {
          let final = '';
          let interim = '';
          for (let i = 0; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += t;
            } else {
              interim += t;
            }
          }
          finalTranscriptRef.current = final;
          interimTranscriptRef.current = interim;
          setTranscript(final + interim);
        };

        recognition.onerror = (event: { error: string }) => {
          console.error('[VoiceRecorder] recognition error:', event.error);
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return; // non-fatal
          }
        };

        recognition.onend = () => {
          console.log('[VoiceRecorder] recognition onend');
          // Small delay to let last results process
          setTimeout(() => doSend(), 100);
        };

        recognition.start();
        console.log('[VoiceRecorder] recognition started');
      }

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('[VoiceRecorder] Microphone access error:', error);
      setStatus('error');
    }
  }, [hasSpeechRecognition, doSend]);

  const stopAndSend = useCallback(() => {
    console.log('[VoiceRecorder] stopAndSend called');
    setIsRecording(false);
    setStatus('processing');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      // recognition.onend will call doSend
      // Safety fallback if onend doesn't fire
      setTimeout(() => doSend(), 2000);
    } else {
      doSend();
    }
  }, [doSend]);

  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    stopMediaTracks();
    setIsRecording(false);
    setStatus('idle');
    setTranscript('');
    setRecordingTime(0);
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    sentRef.current = false;
    onClose();
  }, [stopMediaTracks, onClose]);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setTranscript('');
    sentRef.current = false;
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status & Transcript */}
        <div className="mb-6 flex flex-col items-center gap-3">
          {status === 'recording' && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="text-lg font-semibold tabular-nums text-foreground">{formatTime(recordingTime)}</span>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Traitement en cours…</span>
            </div>
          )}

          {status === 'sent' && (
            <div className="flex items-center gap-2 text-primary">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Message envoyé !</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">Aucune parole détectée</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Parle clairement près du micro et réessaie
              </p>
            </div>
          )}

          {/* Waveform */}
          {status === 'recording' && (
            <div className="flex h-12 w-full items-end justify-center gap-[3px]">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-primary animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 80}%`,
                    animationDelay: `${i * 60}ms`,
                    animationDuration: `${600 + Math.random() * 400}ms`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Live transcript */}
          {transcript && status !== 'error' && (
            <div className="w-full rounded-xl bg-muted/50 p-3 max-h-24 overflow-y-auto">
              <p className="text-sm text-foreground leading-relaxed">{transcript}</p>
            </div>
          )}

          {/* Idle hint */}
          {status === 'idle' && !transcript && (
            <p className="text-sm text-muted-foreground">
              {hasSpeechRecognition
                ? 'Appuie sur le micro pour parler'
                : 'Reconnaissance vocale non supportée par ce navigateur'}
            </p>
          )}
        </div>

        {/* Main button */}
        <div className="flex justify-center gap-4">
          {status === 'idle' && (
            <button
              onClick={startRecording}
              disabled={!hasSpeechRecognition}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-40"
            >
              <Mic className="h-7 w-7" />
            </button>
          )}

          {status === 'recording' && (
            <button
              onClick={stopAndSend}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform active:scale-95"
            >
              <Square className="h-6 w-6 fill-current" />
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={handleRetry}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
            >
              <Mic className="h-7 w-7" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
