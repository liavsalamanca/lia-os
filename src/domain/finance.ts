import type { Transaction } from '../data/schema';

export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function monthSummary(transactions: Transaction[], month: string) {
  const items = transactions.filter((t) => t.date.startsWith(month));
  const sum = (kind: string) => items.filter((t) => t.kind === kind).reduce((total, t) => total + t.amount, 0);
  const income = sum('Ingreso');
  const expenses = sum('Gasto');
  return { items, income, expenses, balance: income - expenses };
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

export function goalPercent(current: number, target: number): number {
  return clampPercent((current / Math.max(1, target)) * 100);
}
