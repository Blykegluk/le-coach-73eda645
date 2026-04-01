import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-sm font-medium text-black">
      <WifiOff className="h-4 w-4" />
      <span>Vous êtes hors-ligne</span>
    </div>
  );
}
