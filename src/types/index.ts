export type Currency =
  | "USD"
  | "EUR"
  | "GBP"
  | "MXN"
  | "ARS"
  | "COP"
  | "BRL"
  | "CLP"
  | "PEN"
  | "HNL"
  | "GTQ";

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
  /** Optional — undefined means it belongs to the user's default account. */
  accountId?: string;
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
  /** Optional — undefined means it belongs to the user's default account. */
  accountId?: string;
  /**
   * Optional link to the Subscription this expense pays for. When set, the
   * subscription's "paid from" / "last paid" / "monthly average" stats are
   * derived from every expense pointing to it. Existing expenses without this
   * field are treated as "not linked" and continue to work unchanged.
   */
  subscriptionId?: string;
}

export type AccountType = "bank" | "cash" | "wallet";

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  /** Display currency for this account (storage is still USD-anchored). */
  currency: Currency;
  /** Initial balance in USD — added to derived flows for the account-level total. */
  initialBalance: number;
  createdAt?: ISODate;
  /** Tailwind/CSS color string used for badges and charts. Optional. */
  color?: string;
  /** lucide-react icon name (e.g. "wallet", "landmark"). Optional. */
  icon?: string;
}

/** Synthetic id used by the UI when an entry has no `accountId`. Never persisted. */
export const DEFAULT_ACCOUNT_ID = "__default__";

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
  | "other"
  | "transfer";

export type IncomeCategory =
  | "salary"
  | "freelance"
  | "investment"
  | "business"
  | "gift"
  | "other"
  | "transfer";

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
