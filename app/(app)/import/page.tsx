import ImportClient from './import-client';

export const revalidate = 0;

export default function ImportPage() {
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Import Statements</h1>
        <p className="text-sm text-muted">
          Drop a CSV or Bank Jago PDF, review the parsed rows, tweak if needed, then import and auto-sync to transactions.
        </p>
      </div>
      <ImportClient />
    </main>
  );
}
