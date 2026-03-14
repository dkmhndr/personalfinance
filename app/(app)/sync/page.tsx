import { SyncButton } from '@/components/sync-button';

export default function SyncPage() {
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Sync Raw Statements</h1>
        <p className="text-sm text-muted">Pull from bank_jago_statements, normalize, and categorize.</p>
      </div>
      <SyncButton />
      <p className="text-sm text-muted">Sync reads rows not yet present in transactions (matched by source_id).</p>
    </main>
  );
}
