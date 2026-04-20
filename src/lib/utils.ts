import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function fmt(value: number, style: 'currency' | 'percent' | 'number' = 'currency', decimals = 0): string {
  if (style === 'currency') {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(decimals === 0 ? 2 : decimals)}M`
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(decimals === 0 ? 1 : decimals)}K`
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals }).format(value)
  }
  if (style === 'percent') {
    return `${value.toFixed(1)}%`
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value)
}

export function fmtFull(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function variance(actual: number, budget: number): number {
  if (budget === 0) return 0
  return ((actual - budget) / Math.abs(budget)) * 100
}

export function varianceClass(pct: number, invertGood = false): string {
  const good = invertGood ? pct < 0 : pct >= 0
  return good ? 'text-emerald-600' : 'text-red-500'
}

export function varianceBadge(pct: number, invertGood = false): string {
  const good = invertGood ? pct < 0 : pct >= 0
  return good ? 'badge-success' : 'badge-danger'
}

export function arrowDir(pct: number, invertGood = false): string {
  if (Math.abs(pct) < 0.1) return '—'
  const up = pct > 0
  return up ? '↑' : '↓'
}
