import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, X } from 'lucide-react';

interface VoiceRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscription: (text: string) => void;
}

export default function VoiceRecorder({ isOpen, onClose, onTranscription }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const hasSpeechRecognition = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Cleanup on unmount / close
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

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

      // Start speech recognition
      if (hasSpeechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; 0: { transcript: string } } } }) => {
          let final = finalTranscriptRef.current;
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
              finalTranscriptRef.current = final;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setTranscript(final + interim);
        };

        recognition.onerror = (event: { error: string }) => {
          console.error('Speech recognition error:', event.error);
        };

        recognition.start();
      }

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone access error:', error);
      setStatus('idle');
    }
  }, [hasSpeechRecognition]);

  const sendTranscriptRef = useRef(false);

  const finishAndSend = useCallback(() => {
    if (sendTranscriptRef.current) return; // prevent double-send
    sendTranscriptRef.current = true;

    const finalText = finalTranscriptRef.current.trim();
    console.log('[VoiceRecorder] finishAndSend, transcript:', finalText);
    if (finalText) {
      onTranscription(finalText);
    }

    // Stop media tracks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Reset UI
    setIsRecording(false);
    setStatus('idle');
    setTranscript('');
    setRecordingTime(0);
    finalTranscriptRef.current = '';
    onClose();
  }, [onTranscription, onClose]);

  const stopAndSend = useCallback(() => {
    setIsRecording(false);
    setStatus('processing');
    sendTranscriptRef.current = false;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      // Listen for the end event to guarantee final results are captured
      recognitionRef.current.onend = () => {
        console.log('[VoiceRecorder] recognition onend fired');
        finishAndSend();
      };
      try { recognitionRef.current.stop(); } catch {}
      // Safety fallback if onend never fires (e.g. iOS quirks)
      setTimeout(() => {
        finishAndSend();
      }, 1500);
    } else {
      // No speech recognition — send immediately
      finishAndSend();
    }
  }, [finishAndSend]);

  const handleClose = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setStatus('idle');
    setTranscript('');
    setRecordingTime(0);
    finalTranscriptRef.current = '';
    onClose();
  }, [cleanup, onClose]);

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
            <span className="text-sm text-muted-foreground">Envoi en cours…</span>
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
          {transcript && (
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
        <div className="flex justify-center">
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
