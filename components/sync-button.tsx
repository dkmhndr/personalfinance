'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function SyncButton({ onDone }: { onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/sync', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || 'Sync failed');
      return;
    }
    setMessage(`Inserted ${data.inserted}, skipped ${data.skipped}${data.total ? ` of ${data.total} new` : ''}`);
    onDone?.();
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handle} disabled={loading}>
        {loading ? 'Syncing…' : 'Sync raw statements'}
      </Button>
      {message && <span className="text-sm text-muted">{message}</span>}
    </div>
  );
}
