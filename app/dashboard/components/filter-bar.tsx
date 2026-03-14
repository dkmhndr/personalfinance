/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { type DashboardFilters } from '@/types';

type Props = {
  categories: { id: string; name: string }[];
  onChange: (filters: DashboardFilters) => void;
  initial: DashboardFilters;
};

export function FilterBar({ categories, onChange, initial }: Props) {
  const [local, setLocal] = useState<DashboardFilters>(initial);

  const quick = (range: 'thisMonth' | 'lastMonth' | 'last3' | 'thisYear' | 'allTime') => {
    const today = new Date();
    let start: Date;
    let end = new Date(today);
    const setRange = (s?: Date, e?: Date) => {
      const next: DashboardFilters = {
        ...local,
        startDate: s ? s.toISOString() : undefined,
        endDate: e ? e.toISOString() : undefined,
        compareStartDate: s ? new Date(s.getFullYear() - 1, s.getMonth(), s.getDate()).toISOString() : undefined,
        compareEndDate: e ? new Date(e.getFullYear() - 1, e.getMonth(), e.getDate(), 23, 59, 59, 999).toISOString() : undefined,
      };
      setLocal(next);
      onChange(next);
    };
    if (range === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      setRange(start, end);
    } else if (range === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      setRange(start, end);
    } else if (range === 'last3') {
      start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      setRange(start, end);
    } else if (range === 'allTime') {
      setRange(undefined, undefined);
    } else {
      start = new Date(today.getFullYear(), 0, 1);
      setRange(start, end);
    }
  };

  const handle = (key: keyof DashboardFilters, value: any) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  };

  const reset = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    const end = today;
    const base: DashboardFilters = {
      viewBy: 'month',
      bucket: 'month',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      compareStartDate: new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()).toISOString(),
      compareEndDate: new Date(end.getFullYear() - 1, end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString(),
    };
    setLocal(base);
    onChange(base);
  };

  return (
    <div className="glass mb-4 flex flex-col gap-3 p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Input
          type="date"
          value={local.startDate ? local.startDate.slice(0, 10) : ''}
          onChange={(e) => handle('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          placeholder="Start"
        />
        <Input
          type="date"
          value={local.endDate ? local.endDate.slice(0, 10) : ''}
          onChange={(e) => handle('endDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          placeholder="End"
        />
        <Select value={local.categoryId || ''} onChange={(e) => handle('categoryId', e.target.value || undefined)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={local.source || ''} onChange={(e) => handle('source', e.target.value || undefined)}>
          <option value="">Any source</option>
          <option value="rule">Rule</option>
          <option value="ai">AI</option>
          <option value="manual">Manual</option>
          <option value="none">None</option>
        </Select>
        <Select value={local.type || ''} onChange={(e) => handle('type', e.target.value || undefined)}>
          <option value="">Type: any</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge onClick={() => quick('thisMonth')} className="cursor-pointer hover:bg-white/10">
          This Month
        </Badge>
        <Badge onClick={() => quick('lastMonth')} className="cursor-pointer hover:bg-white/10">
          Last Month
        </Badge>
        <Badge onClick={() => quick('last3')} className="cursor-pointer hover:bg-white/10">
          Last 3 Months
        </Badge>
        <Badge onClick={() => quick('thisYear')} className="cursor-pointer hover:bg-white/10">
          This Year
        </Badge>
        <Badge onClick={() => quick('allTime')} className="cursor-pointer hover:bg-white/10">
          All Time
        </Badge>
        <Button variant="outline" size="sm" onClick={() => handle('viewBy', local.viewBy === 'month' ? 'year' : 'month')}>
          {local.viewBy === 'month' ? 'Monthly' : 'Yearly'}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
