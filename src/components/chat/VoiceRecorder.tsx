import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscription: (text: string) => void;
}

export default function VoiceRecorder({ isOpen, onClose, onTranscription }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Web Speech API for transcription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(prev => {
          // Remove interim and add final
          const baseTranscript = prev.replace(/\[interim\].*$/, '');
          return baseTranscript + finalTranscript + (interimTranscript ? `[interim]${interimTranscript}` : '');
        });
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript('');

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [isRecording]);

  const handleSend = () => {
    // Clean up transcript (remove interim markers)
    const cleanTranscript = transcript.replace(/\[interim\].*$/, '').trim();
    
    if (cleanTranscript) {
      onTranscription(cleanTranscript);
      handleClose();
    }
  };

  const handleClose = () => {
    stopRecording();
    setAudioBlob(null);
    setTranscript('');
    setRecordingTime(0);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean transcript for display (remove interim markers)
  const displayTranscript = transcript.replace(/\[interim\]/g, ' ').trim();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div 
        className="w-full max-w-md rounded-t-3xl bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Message vocal</h3>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Recording indicator */}
        <div className="mb-6 flex flex-col items-center">
          {isRecording && (
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="text-lg font-medium text-foreground">{formatTime(recordingTime)}</span>
            </div>
          )}

          {/* Waveform visualization placeholder */}
          <div className="mb-4 flex h-16 w-full items-center justify-center gap-1">
            {isRecording ? (
              Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 animate-pulse rounded-full bg-primary"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))
            ) : audioBlob ? (
              <span className="text-muted-foreground">Enregistrement terminé</span>
            ) : (
              <span className="text-muted-foreground">Appuie pour enregistrer</span>
            )}
          </div>

          {/* Transcript preview */}
          {displayTranscript && (
            <div className="w-full rounded-xl bg-muted/50 p-3 mb-4">
              <p className="text-sm text-foreground">{displayTranscript}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          {!isRecording && !audioBlob && (
            <button
              onClick={startRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all active:scale-95"
            >
              <Mic className="h-8 w-8" />
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all active:scale-95"
            >
              <Square className="h-6 w-6" />
            </button>
          )}

          {audioBlob && !isRecording && (
            <>
              <button
                onClick={() => {
                  setAudioBlob(null);
                  setTranscript('');
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={handleSend}
                disabled={isTranscribing || !displayTranscript}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isTranscribing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Help text */}
        {!recognitionRef.current && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            La reconnaissance vocale n'est pas supportée par ce navigateur
      </p>
        )}
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
