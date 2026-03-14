export type TransactionType = 'income' | 'expense' | 'transfer';

export type CategorizationSource = 'manual' | 'rule' | 'ai' | 'none';

export interface Account {
  id: string;
  name: string;
  bank_name: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType | 'transfer';
  created_at: string;
}

export interface Rule {
  id: string;
  keyword: string;
  min_amount: number | null;
  max_amount: number | null;
  category_id: string;
  priority: number;
  created_at: string;
  category?: Category;
}

export interface Transaction {
  id: string;
  source_id: number;
  account_id: string;
  transaction_at: string;
  description: string;
  amount: number;
  type: TransactionType;
  balance: number | null;
  category_id: string | null;
  categorization_source: CategorizationSource;
  created_at: string;
  category?: Category | null;
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  viewBy: 'month' | 'year';
  categoryId?: string;
  source?: CategorizationSource;
  type?: TransactionType;
  minAmount?: number;
  maxAmount?: number;
  uncategorized?: boolean;
  bucket?: 'day' | 'month';
  compareStartDate?: string;
  compareEndDate?: string;
}

export interface SummaryKPI {
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  count: number;
  avgDailySpending?: number;
  compareIncome?: number;
  compareExpense?: number;
  incomeCount?: number;
  expenseCount?: number;
}
