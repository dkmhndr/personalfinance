import ImportClient from './import-client';

export const revalidate = 0;

export default function ImportPage() {
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Import Statements</h1>
        <p className="text-sm text-muted">
          Upload a CSV or Bank Jago PDF, review parsed rows, adjust as needed, then import and sync to transactions.
        </p>
      </div>
      <ImportClient />
    </main>
  );
}
