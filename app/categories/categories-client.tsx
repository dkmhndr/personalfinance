'use client';

import { useState } from 'react';
import { Category } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { v4 as uuid } from 'uuid';

type Props = { initial: Category[] };

export default function CategoriesClient({ initial }: Props) {
  const [categories, setCategories] = useState<Category[]>(initial);
  const [form, setForm] = useState({ name: '', type: 'expense' });

  const createCategory = async () => {
    const id = uuid();
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...form }),
    });
    setCategories([...categories, { ...form, id, created_at: new Date().toISOString() } as Category]);
    setForm({ name: '', type: 'expense' });
  };

  const remove = async (id: string) => {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    setCategories(categories.filter((c) => c.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </Select>
          <Button onClick={createCategory} disabled={!form.name}>
            Add
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Type</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {categories.map((c) => (
                <TR key={c.id}>
                  <TD>{c.name}</TD>
                  <TD>{c.type}</TD>
                  <TD>
                    <Button variant="outline" size="sm" onClick={() => remove(c.id)}>
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
