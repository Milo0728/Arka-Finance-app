export type Currency = "USD" | "EUR" | "GBP" | "MXN" | "ARS" | "COP" | "BRL" | "CLP" | "PEN";

export type ExpenseType = "fixed" | "variable";

export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export type BillingCycle = "monthly" | "quarterly" | "yearly" | "weekly";

export type IncomeFrequency = "once" | "weekly" | "monthly" | "quarterly" | "yearly";

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
  /** Version of the tutorial the user has already finished. Bumped in `TUTORIAL_VERSION`
   * when the walkthrough changes enough that returning users should see it again. */
  tutorialVersion?: number;
  theme?: "light" | "dark" | "system";
  language?: "en" | "es" | "fr";
}

export interface Income {
  id: string;
  userId: string;
  /** Per-occurrence amount in USD (see `frequency`). */
  amount: number;
  category: IncomeCategory;
  /**
   * One-off incomes: the day the money was received.
   * Recurring incomes: the first occurrence (start date); cadence is driven by `frequency`.
   */
  date: ISODate;
  /** Undefined is treated as `"once"` for backward compatibility with legacy records. */
  frequency?: IncomeFrequency;
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
  /** Key under `insights.rules.*` used for the title. */
  titleKey: string;
  /** Key under `insights.rules.*` used for the description. */
  descriptionKey: string;
  /** ICU variables substituted into the title key. */
  titleValues?: Record<string, string>;
  /** ICU variables substituted into the description key. */
  descriptionValues?: Record<string, string>;
  /** Optional right-aligned formatted value (already localised). */
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
