import { useEffect, useState } from 'react'
import { api, BuyerSummary, FilterParams, Platform } from '@/lib/api'
import { defaultDateRange, fmt } from '@/lib/fmt'

const SORT_OPTIONS = [
  { value: 'spend', label: 'Spend (highest)' },
  { value: 'roas', label: 'ROAS (highest)' },
  { value: 'cpa', label: 'CPA (lowest)' },
  { value: 'cvr', label: 'CVR (highest)' },
]

const PLATFORMS: { value: Platform | ''; label: string }[] = [
  { value: '', label: 'All Platforms' },
  { value: 'meta', label: 'Meta' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'snapchat', label: 'Snapchat' },
]

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-amber-50 text-amber-600 border border-amber-200'
      : rank === 2
        ? 'bg-slate-100 text-slate-500 border border-slate-200'
        : rank === 3
          ? 'bg-orange-50 text-orange-600 border border-orange-100'
          : 'text-slate-400'
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums ${cls}`}
    >
      {rank}
    </span>
  )
}

function CapBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-slate-300 text-xs">—</span>
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
        status === 'OK'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'bg-red-50 text-red-600 border border-red-100'
      }`}
    >
      {status}
    </span>
  )
}

export default function LeaderboardPage() {
  const range = defaultDateRange()
  const [startDate, setStartDate] = useState(range.start_date)
  const [endDate, setEndDate] = useState(range.end_date)
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [sortBy, setSortBy] = useState('spend')
  const [rows, setRows] = useState<BuyerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!startDate || !endDate) return
    const params: FilterParams & { sort_by: string } = {
      start_date: startDate,
      end_date: endDate,
      platform: platform || undefined,
      sort_by: sortBy,
    }
    setLoading(true)
    setError(null)
    api.insights
      .leaderboard(params)
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate, platform, sortBy])

  const inputCls =
    'border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors'
  const th =
    'px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em] whitespace-nowrap'
  const td = 'px-4 py-3 text-sm text-slate-700 tabular-nums'

  return (
    <div className="space-y-6">
      {/* ── Header + Filters ── */}
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="text-lg font-semibold text-slate-900 flex-1">Leaderboard</h1>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform | '')}
              className={inputCls}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Rank By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={inputCls}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error.toLowerCase().includes('admin')
            ? 'The leaderboard is visible to admins only.'
            : error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[
                  '#',
                  'Buyer',
                  'Spend',
                  'Impressions',
                  'CTR',
                  'CVR',
                  'CPA',
                  'ROAS',
                  'Purchases',
                  'Revenue',
                  'Cap Status',
                ].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-400">
                    No data for this period.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <RankBadge rank={r.rank} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.full_name}</td>
                    <td className={td}>{fmt.currency(r.spend)}</td>
                    <td className={td}>{fmt.num(r.impressions)}</td>
                    <td className={td}>{fmt.pct(r.ctr)}</td>
                    <td className={td}>{fmt.pct(r.cvr)}</td>
                    <td className={td}>{fmt.currency(r.cpa, 2)}</td>
                    <td className={td}>{fmt.x(r.roas)}</td>
                    <td className={td}>{fmt.num(r.purchases)}</td>
                    <td className={td}>{fmt.currency(r.revenue)}</td>
                    <td className="px-4 py-3">
                      <CapBadge status={r.cpa_cap_status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
