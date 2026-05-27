export type TransactionType = 'Income' | 'Expense'

export interface Transaction {
  id: number
  description: string
  category: string
  amount: number
  date: string
  type: TransactionType
  paymentMethod: string
  notes?: string
  createdAt: string
}

export interface TransactionPayload {
  description: string
  category: string
  amount: number
  date: string
  type: TransactionType
  paymentMethod: string
  notes?: string
}

export interface MonthlySummary {
  month: string
  income: number
  expenses: number
  balance: number
}

export interface CategorySummary {
  category: string
  amount: number
}

export interface TrendInsight {
  title: string
  description: string
  severity: 'success' | 'warning' | 'danger' | 'info'
}

export interface DashboardResponse {
  income: number
  expenses: number
  balance: number
  savingsRate: number
  transactionCount: number
  monthly: MonthlySummary[]
  byCategory: CategorySummary[]
  paymentMethods: CategorySummary[]
  insights: TrendInsight[]
}
