'use client';

import { Select } from '@/components/ui/select';
import { Category } from '@/types';

type Props = {
  categories: Category[];
  value?: string | null;
  onChange: (id: string) => void;
};

export function CategoryDropdown({ categories, value, onChange }: Props) {
  return (
    <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Uncategorized</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}
