import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { flush, enqueue as rawEnqueue, getPendingCount } from '@/lib/offlineQueue';

export function useOfflineQueue() {
  const handleOnline = useCallback(async () => {
    const count = getPendingCount();
    if (count === 0) return;

    const flushed = await flush();
    if (flushed > 0) {
      toast.success(`${flushed} modification${flushed > 1 ? 's' : ''} synchronisée${flushed > 1 ? 's' : ''}`);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    // Also try to flush on mount (in case we came back online while app was closed)
    if (navigator.onLine) handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, [handleOnline]);

  return { enqueue: rawEnqueue, getPendingCount };
}
