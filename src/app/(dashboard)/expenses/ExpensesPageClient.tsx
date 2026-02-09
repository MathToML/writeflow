"use client";

import { useState } from "react";
import type { Json } from "@/types/database";

interface ExpenseRecord {
  id: string;
  title: string;
  content: Json | null;
  tags: string[] | null;
  occurred_at: string | null;
  created_at: string;
}

interface ExpenseContent {
  amount?: number;
  currency?: string;
  expense_category?: string;
  vendor?: string;
  items?: string[];
  description?: string;
  media_url?: string;
}

const EXPENSE_CATEGORIES: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  food: { label: "Food", color: "bg-orange-100 text-orange-700", icon: "🍽️" },
  transport: { label: "Transport", color: "bg-blue-100 text-blue-700", icon: "🚗" },
  shopping: { label: "Shopping", color: "bg-pink-100 text-pink-700", icon: "🛍️" },
  medical: { label: "Medical", color: "bg-red-100 text-red-700", icon: "🏥" },
  culture: { label: "Culture", color: "bg-purple-100 text-purple-700", icon: "🎭" },
  housing: { label: "Housing", color: "bg-green-100 text-green-700", icon: "🏠" },
  education: { label: "Education", color: "bg-indigo-100 text-indigo-700", icon: "📚" },
  other: { label: "Other", color: "bg-slate-100 text-slate-700", icon: "📦" },
};

function formatAmount(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(amount);
}

function getContent(expense: ExpenseRecord): ExpenseContent {
  if (!expense.content || typeof expense.content !== "object" || Array.isArray(expense.content)) {
    return {};
  }
  return expense.content as unknown as ExpenseContent;
}

function getExpenseDate(expense: ExpenseRecord): string {
  const dateStr = expense.occurred_at ?? expense.created_at;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
}

function getDateKey(expense: ExpenseRecord): string {
  const dateStr = expense.occurred_at ?? expense.created_at;
  return dateStr.slice(0, 10);
}

interface ExpensesPageClientProps {
  expenses: ExpenseRecord[];
  currentMonth: string;
}

export default function ExpensesPageClient({
  expenses,
  currentMonth,
}: ExpensesPageClientProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const month = new Date(currentMonth);

  // Filter expenses
  const filtered = filter
    ? expenses.filter((e) => {
        const c = getContent(e);
        return c.expense_category === filter;
      })
    : expenses;

  // Group by date
  const groups = new Map<string, ExpenseRecord[]>();
  for (const expense of filtered) {
    const key = getDateKey(expense);
    const group = groups.get(key) ?? [];
    group.push(expense);
    groups.set(key, group);
  }

  // Monthly total
  const monthlyTotal = expenses.reduce((sum, e) => {
    const c = getContent(e);
    return sum + (c.amount ?? 0);
  }, 0);

  // Category breakdown
  const categoryTotals = new Map<string, number>();
  for (const e of expenses) {
    const c = getContent(e);
    const cat = c.expense_category ?? "other";
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + (c.amount ?? 0));
  }

  // Used categories for filter chips
  const usedCategories = [...categoryTotals.keys()].sort(
    (a, b) => (categoryTotals.get(b) ?? 0) - (categoryTotals.get(a) ?? 0),
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <h1 className="text-2xl font-bold text-slate-900">
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h1>
        <p className="text-3xl font-light text-slate-700 tabular-nums">
          {formatAmount(monthlyTotal)}
        </p>
        <p className="text-sm text-slate-400">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""} this month
        </p>
      </div>

      {/* Category breakdown chips */}
      {usedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === null
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            All
          </button>
          {usedCategories.map((cat) => {
            const info = EXPENSE_CATEGORIES[cat] ?? EXPENSE_CATEGORIES.other;
            const total = categoryTotals.get(cat) ?? 0;
            return (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? null : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filter === cat
                    ? "bg-slate-800 text-white"
                    : `${info.color} hover:opacity-80`
                }`}
              >
                {info.icon} {info.label} {formatAmount(total)}
              </button>
            );
          })}
        </div>
      )}

      {/* Expense list grouped by date */}
      {groups.size > 0 ? (
        <div className="space-y-4">
          {[...groups.entries()].map(([dateKey, items]) => {
            const dayTotal = items.reduce((sum, e) => {
              const c = getContent(e);
              return sum + (c.amount ?? 0);
            }, 0);

            return (
              <div key={dateKey} className="space-y-1">
                {/* Date header */}
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-medium text-slate-400">
                    {getExpenseDate(items[0])}
                  </span>
                  <span className="text-xs font-medium text-slate-400 tabular-nums">
                    {formatAmount(dayTotal)}
                  </span>
                </div>

                {/* Expense items */}
                {items.map((expense) => {
                  const c = getContent(expense);
                  const catInfo =
                    EXPENSE_CATEGORIES[c.expense_category ?? "other"] ??
                    EXPENSE_CATEGORIES.other;

                  return (
                    <div
                      key={expense.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      {/* Category icon */}
                      <span className="text-xl shrink-0">{catInfo.icon}</span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {expense.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.vendor && (
                            <span className="text-xs text-slate-400 truncate">
                              {c.vendor}
                            </span>
                          )}
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${catInfo.color}`}
                          >
                            {catInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <span className="text-sm font-semibold text-slate-700 tabular-nums shrink-0">
                        {formatAmount(c.amount ?? 0, c.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-slate-600 font-medium">No expenses yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Send a receipt photo or tell me what you spent — I&apos;ll track it
          </p>
        </div>
      )}
    </div>
  );
}
