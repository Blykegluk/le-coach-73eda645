import { supabase } from '@/integrations/supabase/client';

interface QueuedMutation {
  id: string;
  table: string;
  operation: 'upsert' | 'update' | 'insert';
  payload: Record<string, unknown>;
  matchColumns?: string[];
  createdAt: string;
}

const STORAGE_KEY = 'offline_queue';

function getQueue(): QueuedMutation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueue(mutation: Omit<QueuedMutation, 'id' | 'createdAt'>) {
  const queue = getQueue();
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  saveQueue(queue);
}

export async function flush(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedMutation[] = [];
  let flushed = 0;

  for (const m of queue) {
    try {
      let result;
      if (m.operation === 'upsert') {
        result = await (supabase.from(m.table) as any).upsert(m.payload, {
          onConflict: m.matchColumns?.join(','),
        });
      } else if (m.operation === 'update') {
        const { id, ...rest } = m.payload;
        result = await (supabase.from(m.table) as any).update(rest).eq('id', id);
      } else {
        result = await (supabase.from(m.table) as any).insert(m.payload);
      }

      if (result.error) {
        console.error('[OfflineQueue] Flush error:', result.error);
        remaining.push(m);
      } else {
        flushed++;
      }
    } catch {
      remaining.push(m);
    }
  }

  saveQueue(remaining);
  return flushed;
}

export function getPendingCount(): number {
  return getQueue().length;
}
