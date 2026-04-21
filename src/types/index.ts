export type Currency = "USD" | "EUR" | "GBP" | "MXN" | "ARS" | "COP" | "BRL" | "CLP" | "PEN";

export type ExpenseType = "fixed" | "variable";

export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export type BillingCycle = "monthly" | "quarterly" | "yearly" | "weekly";

export type ISODate = string;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  monthlyIncome: number;
  currency: Currency;
  photoURL?: string;
  createdAt: ISODate;
  onboardingCompleted?: boolean;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  category: IncomeCategory;
  date: ISODate;
  description?: string;
  createdAt?: ISODate;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  date: ISODate;
  description?: string;
  createdAt?: ISODate;
}

export interface Budget {
  id: string;
  userId: string;
  category: ExpenseCategory;
  limit: number;
  period: BudgetPeriod;
  createdAt?: ISODate;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: ISODate;
  createdAt?: ISODate;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  category?: ExpenseCategory;
  renewalDate?: ISODate;
  createdAt?: ISODate;
}

export type ExpenseCategory =
  | "food"
  | "transport"
  | "housing"
  | "entertainment"
  | "utilities"
  | "subscriptions"
  | "health"
  | "education"
  | "shopping"
  | "savings"
  | "debt"
  | "other";

export type IncomeCategory = "salary" | "freelance" | "investment" | "business" | "gift" | "other";

export interface FinancialInsight {
  id: string;
  level: "positive" | "warning" | "critical" | "info";
  title: string;
  description: string;
  value?: string;
}

export interface HealthScoreBreakdown {
  score: number;
  savingsRate: number;
  expenseRatio: number;
  budgetAdherence: number;
  goalProgress: number;
  tier: "critical" | "poor" | "fair" | "good" | "excellent";
}
