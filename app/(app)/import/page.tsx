import ImportClient from './import-client';

export const revalidate = 0;

export default function ImportPage() {
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Import CSV</h1>
        <p className="text-sm text-muted">Upload bank statements (CSV); rows go to raw table then auto-sync to transactions.</p>
      </div>
      <ImportClient />
    </main>
  );
}
