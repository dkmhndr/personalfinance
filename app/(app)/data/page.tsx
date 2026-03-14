import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ListChecks, Wand2, FolderTree, FileText, RefreshCw } from 'lucide-react';

const sections = [
  {
    href: '/review',
    title: 'Review',
    description: 'Review low-confidence transactions and set categories.',
    icon: <ListChecks size={16} />,
  },
  {
    href: '/rules',
    title: 'Rules',
    description: 'Maintain keyword rules for auto-categorization.',
    icon: <Wand2 size={16} />,
  },
  {
    href: '/categories',
    title: 'Categories',
    description: 'Create or edit categories and their types.',
    icon: <FolderTree size={16} />,
  },
  {
    href: '/statements',
    title: 'Raw Statements',
    description: 'Correct parsed statement rows before they sync.',
    icon: <FileText size={16} />,
  },
  {
    href: '/sync',
    title: 'Sync',
    description: 'Re-run normalization for new statement rows.',
    icon: <RefreshCw size={16} />,
  },
];

export default function DataHubPage() {
  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Data Hub</h1>
        <p className="text-sm text-muted">All data tools in one place.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="group block h-full">
            <Card className="h-full bg-white/5 transition hover:border-brand-300/60 hover:bg-white/8 flex flex-col">
              <CardHeader className="flex-row items-center gap-3 mb-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-brand-100">
                  {section.icon}
                </div>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-1 text-sm text-muted flex-1 flex flex-col justify-between">
                <p className="leading-snug">{section.description}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-brand-100 font-semibold">
                  Open <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
