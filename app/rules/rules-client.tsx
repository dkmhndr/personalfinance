'use client';

import { useEffect, useState } from 'react';
import { Category, Rule } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Props = { categories: Category[] };

export default function RulesClient({ categories }: Props) {
  const [rules, setRules] = useState<(Rule & { categories?: Category })[]>([]);
  const [form, setForm] = useState({ keyword: '', category_id: '', min_amount: '', max_amount: '', priority: '100' });

  const load = async () => {
    const res = await fetch('/api/rules');
    const data = await res.json();
    setRules(data);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        min_amount: form.min_amount ? Number(form.min_amount) : null,
        max_amount: form.max_amount ? Number(form.max_amount) : null,
        priority: Number(form.priority),
      }),
    });
    setForm({ keyword: '', category_id: '', min_amount: '', max_amount: '', priority: '100' });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Rule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-5">
          <Input
            placeholder="Keyword"
            value={form.keyword}
            onChange={(e) => setForm({ ...form, keyword: e.target.value.toUpperCase() })}
          />
          <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            placeholder="Min amount"
            value={form.min_amount}
            onChange={(e) => setForm({ ...form, min_amount: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Max amount"
            value={form.max_amount}
            onChange={(e) => setForm({ ...form, max_amount: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Priority (lower = higher)"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          />
        </div>
        <Button onClick={submit} disabled={!form.keyword || !form.category_id}>
          Add Rule
        </Button>

        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Keyword</TH>
                <TH>Category</TH>
                <TH>Min</TH>
                <TH>Max</TH>
                <TH>Priority</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {rules.map((r) => (
                <TR key={r.id}>
                  <TD>{r.keyword}</TD>
                  <TD>{r.categories?.name}</TD>
                  <TD>{r.min_amount ?? '—'}</TD>
                  <TD>{r.max_amount ?? '—'}</TD>
                  <TD>{r.priority}</TD>
                  <TD>
                    <Button variant="outline" size="sm" onClick={() => remove(r.id)}>
                      Delete
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
