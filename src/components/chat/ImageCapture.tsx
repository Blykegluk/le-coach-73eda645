import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, Send, RotateCcw, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (imageUrl: string, description?: string) => void;
  userId: string | null;
}

export default function ImageCapture({ isOpen, onClose, onImageCaptured, userId }: ImageCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connect the stream to the video element once both are available
  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCamera, cameraStream]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setCameraStream(stream);
      setShowCamera(true);
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
    setShowCamera(false);
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
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAndSend = async () => {
    if (!capturedImage || !userId) return;

    setIsUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const fileName = `${userId}/${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-uploads')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      // Get signed URL (bucket is private)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('chat-uploads')
        .createSignedUrl(data.path, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      onImageCaptured(urlData.signedUrl);
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'envoi de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-md mx-4">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera view or captured image */}
        <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-black">
          {showCamera && !capturedImage && (
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

          {!showCamera && !capturedImage && (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
              <p className="text-center text-white/70 mb-4">
                Prends une photo ou choisis une image
              </p>
              <div className="flex gap-4">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center gap-2 rounded-xl bg-white/10 p-6 text-white transition-all hover:bg-white/20"
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-sm">Caméra</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-xl bg-white/10 p-6 text-white transition-all hover:bg-white/20"
                >
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">Galerie</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4">
          {showCamera && !capturedImage && (
            <button
              onClick={capturePhoto}
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-all active:scale-95"
            >
              <div className="h-12 w-12 rounded-full bg-white" />
            </button>
          )}

          {capturedImage && (
            <>
              <button
                onClick={retake}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                onClick={uploadAndSend}
                disabled={isUploading}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
