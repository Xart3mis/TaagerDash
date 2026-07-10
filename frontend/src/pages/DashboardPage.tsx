import { useEffect, useState } from 'react'
import { api, CampaignSummary, FilterParams, MetricsSummary, Platform, PlatformSummary } from '@/lib/api'
import { defaultDateRange, fmt } from '@/lib/fmt'

const PLATFORMS: { value: Platform | ''; label: string }[] = [
  { value: '', label: 'All Platforms' },
  { value: 'meta', label: 'Meta' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'snapchat', label: 'Snapchat' },
]

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
}

const PLATFORM_BADGE: Record<string, string> = {
  meta: 'bg-blue-100 text-blue-700',
  tiktok: 'bg-gray-900 text-white',
  snapchat: 'bg-yellow-100 text-yellow-700',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow p-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-7 bg-gray-200 rounded w-1/2" />
    </div>
  )
}

function TableSkeleton({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const range = defaultDateRange()
  const [startDate, setStartDate] = useState(range.start_date)
  const [endDate, setEndDate] = useState(range.end_date)
  const [platform, setPlatform] = useState<Platform | ''>('')

  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [byPlatform, setByPlatform] = useState<PlatformSummary[]>([])
  const [byCampaign, setByCampaign] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!startDate || !endDate) return
    const params: FilterParams = {
      start_date: startDate,
      end_date: endDate,
      platform: platform || undefined,
    }
    setLoading(true)
    setError(null)

    Promise.all([
      api.insights.summary(params),
      api.insights.byPlatform({ start_date: startDate, end_date: endDate }),
      api.insights.byCampaign(params),
    ])
      .then(([s, bp, bc]) => {
        setSummary(s)
        setByPlatform(bp)
        setByCampaign(bc)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate, platform])

  const inputCls =
    'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const th = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide'
  const td = 'px-4 py-3 text-sm text-gray-700'

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <h2 className="text-xl font-semibold text-gray-900 flex-1">Dashboard</h2>
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
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading || !summary ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard label="Spend" value={fmt.currency(summary.spend)} />
            <KpiCard label="Revenue" value={fmt.currency(summary.revenue)} />
            <KpiCard label="ROAS" value={fmt.x(summary.roas)} />
            <KpiCard
              label="CPA"
              value={fmt.currency(summary.cpa, 2)}
              sub={summary.cpa_cap_status ?? undefined}
            />
            <KpiCard label="Purchases" value={fmt.num(summary.purchases)} />
            <KpiCard
              label="CTR"
              value={fmt.pct(summary.ctr)}
              sub={`CVR ${fmt.pct(summary.cvr)}`}
            />
          </>
        )}
      </div>

      {/* By Platform */}
      <section className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">By Platform</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Platform',
                  'Spend',
                  'Impressions',
                  'Clicks',
                  'CTR',
                  'CPC',
                  'CPM',
                  'Purchases',
                  'Revenue',
                  'ROAS',
                  'CPA',
                ].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton cols={11} />
              ) : byPlatform.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">
                    No data for this period.
                  </td>
                </tr>
              ) : (
                byPlatform.map((r) => (
                  <tr key={r.platform} className="hover:bg-gray-50">
                    <td className={`${td} font-medium text-gray-800`}>
                      {PLATFORM_LABEL[r.platform] ?? r.platform}
                    </td>
                    <td className={td}>{fmt.currency(r.spend)}</td>
                    <td className={td}>{fmt.num(r.impressions)}</td>
                    <td className={td}>{fmt.num(r.link_clicks)}</td>
                    <td className={td}>{fmt.pct(r.ctr)}</td>
                    <td className={td}>{fmt.currency(r.cpc, 2)}</td>
                    <td className={td}>{fmt.currency(r.cpm, 2)}</td>
                    <td className={td}>{fmt.num(r.purchases)}</td>
                    <td className={td}>{fmt.currency(r.revenue)}</td>
                    <td className={td}>{fmt.x(r.roas)}</td>
                    <td className={td}>{fmt.currency(r.cpa, 2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* By Campaign */}
      <section className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">By Campaign</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Campaign',
                  'Platform',
                  'Spend',
                  'Impressions',
                  'Clicks',
                  'CTR',
                  'CVR',
                  'CPA',
                  'ROAS',
                  'Purchases',
                  'Revenue',
                ].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton cols={11} />
              ) : byCampaign.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">
                    No campaign data for this period.
                  </td>
                </tr>
              ) : (
                [...byCampaign]
                  .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
                  .map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td
                        className={`${td} font-medium text-gray-800 max-w-xs truncate`}
                        title={r.campaign}
                      >
                        {r.campaign}
                      </td>
                      <td className={td}>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLATFORM_BADGE[r.platform] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {PLATFORM_LABEL[r.platform] ?? r.platform}
                        </span>
                      </td>
                      <td className={td}>{fmt.currency(r.spend)}</td>
                      <td className={td}>{fmt.num(r.impressions)}</td>
                      <td className={td}>{fmt.num(r.link_clicks)}</td>
                      <td className={td}>{fmt.pct(r.ctr)}</td>
                      <td className={td}>{fmt.pct(r.cvr)}</td>
                      <td className={td}>{fmt.currency(r.cpa, 2)}</td>
                      <td className={td}>{fmt.x(r.roas)}</td>
                      <td className={td}>{fmt.num(r.purchases)}</td>
                      <td className={td}>{fmt.currency(r.revenue)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
