export type TransactionType = 'income' | 'expense' | 'transfer';

export type CategorizationSource = 'manual' | 'rule' | 'ai' | 'none';

export type CategoryType =
  | 'Income:Salary'
  | 'Income:Bonus'
  | 'Income:Investment'
  | 'Income:Other'
  | 'Expense:Housing'
  | 'Expense:Utilities'
  | 'Expense:Food & Dining'
  | 'Expense:Groceries'
  | 'Expense:Transport'
  | 'Expense:Healthcare'
  | 'Expense:Education'
  | 'Expense:Entertainment'
  | 'Expense:Shopping'
  | 'Expense:Fees & Charges'
  | 'Expense:Subscriptions'
  | 'Expense:Travel'
  | 'Transfer'
  | 'Saving'
  | 'Uncategorized';

export type CategorizationResult = {
  items: Array<{
    id: string;
    category: CategoryType;
    note?: string;
    confidence?: number;
  }>;
};

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

export type BudgetRecurrence = 'none' | 'monthly';

export interface BudgetLine {
  id: string;
  period: string; // YYYY-MM
  scenario: string;
  type: TransactionType | 'transfer';
  category_id: string | null;
  label: string;
  amount: number;
  recurrence: BudgetRecurrence;
  created_at?: string;
  category?: Category | null;
}

export interface BudgetSnapshot {
  lines: BudgetLine[];
  totals: {
    plannedIncome: number;
    plannedExpense: number;
    netPlanned: number;
  };
  actual: {
    income: number;
    expense: number;
    net: number;
    lastMonthIncome: number;
    lastMonthExpense: number;
    last3AvgIncome: number;
    last3AvgExpense: number;
  };
}
