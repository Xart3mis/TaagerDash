// KPI formatting utilities — consistent across all dashboard views.

export const fmt = {
  /** "$1,234" or "$1,234.56" */
  currency(v: number | null | undefined, decimals = 0): string {
    if (v == null) return '—'
    return (
      '$' +
      v.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    )
  },

  /** "12.3%" */
  pct(v: number | null | undefined, decimals = 1): string {
    if (v == null) return '—'
    return (v * 100).toFixed(decimals) + '%'
  },

  /** "2.45x" */
  x(v: number | null | undefined, decimals = 2): string {
    if (v == null) return '—'
    return v.toFixed(decimals) + 'x'
  },

  /** "1,234" */
  num(v: number | null | undefined, decimals = 0): string {
    if (v == null) return '—'
    return v.toLocaleString('en-US', { maximumFractionDigits: decimals })
  },
}

/** Returns the last 30 days as ISO date strings (inclusive). */
export function defaultDateRange(): { start_date: string; end_date: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  }
}

/** Today as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
