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
      ? 'bg-yellow-100 text-yellow-700'
      : rank === 2
        ? 'bg-gray-100 text-gray-600'
        : rank === 3
          ? 'bg-orange-100 text-orange-600'
          : 'text-gray-400'
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${cls}`}>
      {rank}
    </span>
  )
}

function CapBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
    'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const th = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide'
  const td = 'px-4 py-3 text-sm text-gray-700'

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <h2 className="text-xl font-semibold text-gray-900 flex-1">Leaderboard</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Platform</label>
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
            <label className="block text-xs text-gray-500 mb-1">Rank By</label>
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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error.toLowerCase().includes('admin')
            ? 'The leaderboard is visible to admins only.'
            : error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
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
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-400">
                    No data for this period.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <RankBadge rank={r.rank} />
                    </td>
                    <td className={`${td} font-medium text-gray-800`}>{r.full_name}</td>
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
