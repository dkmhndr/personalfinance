'use client';

import React, { useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { CategoryDropdown } from '@/components/category-dropdown';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Transaction, Category } from '@/types';
import Link from 'next/link';

type Props = {
  data: Transaction[];
  categories: Category[];
  onManualChange: (id: string, categoryId: string) => Promise<void>;
  hide?: boolean;
};

export function TransactionsTable({ data, categories, onManualChange, hide }: Props) {
  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        header: 'Date',
        accessorKey: 'transaction_at',
        cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(String(getValue()))}</span>,
        size: 120,
      },
      {
        header: 'Description',
        accessorKey: 'description',
        cell: ({ row }) => (
          <Link href={`/statements/${row.original.source_id}`} className="line-clamp-2 hover:text-brand-300 underline">
            {row.original.description}
          </Link>
        ),
        size: 260,
      },
      {
        header: 'Category',
        accessorKey: 'categories.name',
        cell: ({ row }) => (
          <CategoryDropdown
            categories={categories}
            value={row.original.category_id}
            onChange={(val) => onManualChange(row.original.id, val)}
          />
        ),
        size: 180,
      },
      {
        header: 'Amount',
        accessorKey: 'amount',
        cell: ({ row }) => (
          <span
            className={cn(
              row.original.type === 'expense' ? 'text-rose-400' : 'text-emerald-400',
              hide ? 'blur-md select-none' : '',
            )}
          >
            {row.original.type === 'expense' ? '-' : '+'}
            {hide ? formatCurrency(row.original.amount) : formatCurrency(row.original.amount)}
          </span>
        ),
        size: 160,
      },
      {
        header: 'Balance',
        accessorKey: 'balance',
        cell: ({ getValue }) =>
          getValue() ? (
            <span className={hide ? 'blur-md select-none' : ''}>{formatCurrency(Number(getValue()))}</span>
          ) : (
            '—'
          ),
        size: 160,
      },
      {
        header: 'Source',
        accessorKey: 'categorization_source',
        cell: ({ getValue }) => <Badge>{String(getValue())}</Badge>,
        size: 120,
      },
    ],
    [categories, onManualChange],
  );

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'transaction_at', desc: true }]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="glass">
      <div className="overflow-x-auto">
        <Table>
          <THead>
            {table.getHeaderGroups().map((hg) => (
              <TR key={hg.id}>
                {hg.headers.map((header) => (
                  <TH
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? null}
                  </TH>
                ))}
              </TR>
            ))}
          </THead>
          <TBody>
            {table.getRowModel().rows.map((row) => (
              <TR key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TD key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
