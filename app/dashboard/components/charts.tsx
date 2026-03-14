/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const palette = ['#22c55e', '#60a5fa', '#a855f7', '#f97316', '#f43f5e', '#06b6d4', '#facc15', '#38bdf8'];
const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #1f2937',
  borderRadius: 8,
  color: '#e5e7eb',
  padding: '8px 10px',
};
const itemStyle = { color: '#e5e7eb' };
const currencyFormatter = (v: any) => formatCurrency(Number(v));
const blurCurrency = (hide: boolean, v: any) =>
  hide ? <span className="blur-sm select-none">{formatCurrency(Number(v))}</span> : formatCurrency(Number(v));
const maskDots = (v: any) => {
  const num = Math.abs(Number(v));
  if (!Number.isFinite(num)) return '•••';
  const digits = Math.max(1, Math.round(num).toString().length);
  const cap = Math.min(digits, 10);
  return '•'.repeat(cap);
};
const formatAbbrev = (v: number) => {
  const abs = Math.abs(v);
  const fmt = (n: number) => n.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1_000_000_000) return `${fmt(v / 1_000_000_000)}b`;
  if (abs >= 1_000_000) return `${fmt(v / 1_000_000)}m`;
  if (abs >= 1_000) return `${fmt(v / 1_000)}k`;
  return `${v}`;
};

type CommonProps = { onSelectCategory?: (name: string) => void };

export function ExpenseDonut({
  data,
  onSelectCategory,
  hide = false,
}: { data: { name: string; total: number }[] } & CommonProps & { hide?: boolean }) {
  const formatter = (v: any) => (isNaN(Number(v)) ? '—' : blurCurrency(hide, v));
  const activeShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={fill}
        strokeOpacity={0.35}
      />
    );
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense by Category</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              onClick={(entry) => onSelectCategory?.(entry.name)}
              activeShape={activeShape}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={palette[idx % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={formatter}
              contentStyle={tooltipStyle}
              itemStyle={itemStyle}
              labelFormatter={(name) => `Category: ${name}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CashflowTrend({ data, hide = false }: { data: { period: string; income: number; expense: number }[]; hide?: boolean }) {
  const tickInterval = data.length > 12 ? Math.ceil(data.length / 12) - 1 : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cashflow Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="period" interval={tickInterval} angle={data.length > 12 ? -45 : 0} textAnchor={data.length > 12 ? 'end' : 'middle'} height={data.length > 12 ? 50 : 30} />
            <YAxis tickFormatter={(v) => (hide ? '' : formatAbbrev(v))} />
            <Tooltip
              formatter={(v: any) => (hide ? maskDots(v) : currencyFormatter(v))}
              contentStyle={tooltipStyle}
              itemStyle={itemStyle}
              labelFormatter={(l) => `Period: ${l}`}
              cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DailySpendingBar({
  data,
  onSelectDate,
  bucket = 'day',
  hide = false,
}: {
  data: { date: string; total: number }[];
  onSelectDate?: (date: string) => void;
  bucket?: 'day' | 'month';
  hide?: boolean;
}) {
  const cap = bucket === 'month' ? 10_000_000 : 500_000;
  const cappedData = data.map((d) => ({
    ...d,
    capped: Math.min(d.total, cap),
    original: d.total,
  }));
  const domainMax = cap;
  const labelFormatter = bucket === 'month' ? (d: string) => d : (d: string) => (d ? d.slice(8, 10) : '');
  const tickInterval = data.length > 24 ? Math.ceil(data.length / 12) - 1 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{bucket === 'month' ? 'Monthly Spending' : 'Daily Spending'}</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cappedData}>
            <XAxis
              dataKey="date"
              interval={tickInterval}
              angle={-45}
              textAnchor="end"
              height={60}
              tickFormatter={labelFormatter}
            />
            <YAxis
              tickFormatter={(v) => {
                if (hide) return '';
                if (v >= domainMax) return `≥${formatAbbrev(domainMax)}`;
                return formatAbbrev(v);
              }}
              domain={[0, domainMax]}
              ticks={[0, domainMax / 4, domainMax / 2, (domainMax * 3) / 4, domainMax]}
            />
            <Tooltip
              formatter={(_v: any, _n, props: any) =>
                hide
                  ? maskDots(props?.payload?.original ?? _v)
                  : currencyFormatter(props?.payload?.original ?? _v)
              }
              contentStyle={tooltipStyle}
              itemStyle={itemStyle}
              labelFormatter={(l) => `Date: ${l}`}
              cursor={{ fill: 'rgba(255,255,255,0.06)' }}
            />
            <Bar
              dataKey="capped"
              name="Spending"
              fill="#60a5fa"
              radius={[6, 6, 0, 0]}
              onClick={(payload) => onSelectDate?.(payload?.date)}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TopCategoriesBar({
  data,
  onSelectCategory,
  hide = false,
}: { data: { name: string; total: number }[] } & CommonProps & { hide?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Spending Categories</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 60 }}>
            <XAxis type="number" tickFormatter={(v) => (hide ? '' : formatAbbrev(v))} />
            <YAxis type="category" dataKey="name" />
            <Tooltip
              formatter={(v: any) => (hide ? maskDots(v) : currencyFormatter(v))}
              contentStyle={tooltipStyle}
              itemStyle={itemStyle}
              labelFormatter={(l) => `Category: ${l}`}
              cursor={{ fill: 'rgba(255,255,255,0.06)' }}
            />
            <Bar
              dataKey="total"
              fill="#f97316"
              radius={[6, 6, 6, 6]}
              onClick={(payload) => onSelectCategory?.(payload?.name)}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
