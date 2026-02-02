import { useState, useRef, useCallback } from 'react';
import { Camera, X, Send, RotateCcw, Image as ImageIcon, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealAdded: () => void;
  userId: string | null;
  mealType: string;
  mealName: string;
}

export default function AddMealModal({ 
  isOpen, 
  onClose, 
  onMealAdded, 
  userId, 
  mealType,
  mealName 
}: AddMealModalProps) {
  const [mode, setMode] = useState<'choose' | 'camera' | 'text'>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setCameraStream(stream);
      setMode('camera');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Impossible d\'accéder à la caméra');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setMode('camera'); // Switch to camera mode to show the image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setTextInput('');
    setMode('choose');
    onClose();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const uploadImageAndAnalyze = async () => {
    if (!capturedImage || !userId) return;

    setIsProcessing(true);
    try {
      // Upload to Supabase Storage
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const fileName = `${userId}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-uploads')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(uploadData.path);

      // Call coach-chat to analyze the meal
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: `Analyse cette photo de mon ${mealName.toLowerCase()} et enregistre-le. Type de repas: ${mealType}`,
          imageUrl: urlData.publicUrl,
        },
      });

      if (error) throw error;

      toast.success('Repas enregistré !');
      onMealAdded();
      handleClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeText = async () => {
    if (!textInput.trim() || !userId) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: `J'ai pris mon ${mealName.toLowerCase()}: ${textInput}. Type de repas: ${mealType}. Enregistre ce repas.`,
        },
      });

      if (error) throw error;

      toast.success('Repas enregistré !');
      onMealAdded();
      handleClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl bg-card overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Ajouter {mealName.toLowerCase()}
          </h3>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Choose mode */}
          {mode === 'choose' && !capturedImage && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground text-center mb-2">
                Comment veux-tu ajouter ton repas ?
              </p>
              <button
                onClick={startCamera}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Prendre une photo</p>
                  <p className="text-sm text-muted-foreground">L'IA analysera ton repas</p>
                </div>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Choisir une image</p>
                  <p className="text-sm text-muted-foreground">Depuis ta galerie</p>
                </div>
              </button>
              <button
                onClick={() => setMode('text')}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Décrire le repas</p>
                  <p className="text-sm text-muted-foreground">L'IA estimera les macros</p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Camera mode */}
          {mode === 'camera' && (
            <div className="flex flex-col gap-4">
              <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black">
                {!capturedImage && cameraStream && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                )}
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex justify-center gap-4">
                {!capturedImage && cameraStream && (
                  <>
                    <button
                      onClick={() => { stopCamera(); setMode('choose'); }}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary bg-primary/20 transition-all active:scale-95"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary" />
                    </button>
                  </>
                )}

                {capturedImage && (
                  <>
                    <button
                      onClick={retake}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={uploadImageAndAnalyze}
                      disabled={isProcessing}
                      className="flex h-14 items-center gap-2 px-6 rounded-full bg-primary text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          <span className="font-medium">Analyser</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Text mode */}
          {mode === 'text' && (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setMode('choose')}
                className="self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Retour
              </button>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ex: 3 œufs au plat avec du pain complet et un verre de jus d'orange"
                className="w-full h-32 p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={analyzeText}
                disabled={!textInput.trim() || isProcessing}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Enregistrer le repas</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
