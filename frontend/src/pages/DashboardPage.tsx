import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import {
  api,
  CampaignSummary,
  DailyMetrics,
  FilterParams,
  MetricsSummary,
  Platform,
  PlatformSummary,
} from '@/lib/api'
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
  meta: 'bg-blue-50 text-blue-700 border border-blue-100',
  tiktok: 'bg-slate-800 text-slate-100',
  snapchat: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
}

const PLATFORM_COLOR: Record<string, string> = {
  meta: '#3b82f6',
  tiktok: '#1e293b',
  snapchat: '#eab308',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400 tabular-nums">{sub}</p>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="h-2.5 bg-slate-100 rounded-full w-1/2 mb-3" />
      <div className="h-7 bg-slate-100 rounded-lg w-2/3" />
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
              <div className="h-4 bg-slate-50 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5">
      <div className="h-3 bg-slate-100 rounded w-1/4" />
      <div className="h-40 bg-slate-50 rounded-lg" />
    </div>
  )
}

// Custom tooltip for the trend chart
function TrendTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm text-xs">
      <p className="font-medium text-slate-600 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {fmt.currency(p.value)}
        </p>
      ))}
    </div>
  )
}

// Custom tooltip for campaign bar chart
function CampaignTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ value: number }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="tabular-nums text-slate-700">{fmt.currency(payload[0].value)}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sort state hook for sortable tables
// ---------------------------------------------------------------------------

type SortDir = 'asc' | 'desc'
function useSort<T>(data: T[], defaultKey: keyof T) {
  const [key, setKey] = useState<keyof T>(defaultKey)
  const [dir, setDir] = useState<SortDir>('desc')

  function toggle(k: keyof T) {
    if (k === key) {
      setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setKey(k)
      setDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[key] as number | null | undefined
    const bv = b[key] as number | null | undefined
    const an = av ?? -Infinity
    const bn = bv ?? -Infinity
    return dir === 'desc' ? bn - an : an - bn
  })

  return { sorted, key, dir, toggle }
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
  const [byDay, setByDay] = useState<DailyMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const campaignSort = useSort(byCampaign, 'spend' as keyof CampaignSummary)

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
      api.insights.byDay(params),
    ])
      .then(([s, bp, bc, bd]) => {
        setSummary(s)
        setByPlatform(bp)
        setByCampaign(bc)
        setByDay(bd)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate, platform])

  const inputCls =
    'border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors'
  const th = (col: keyof CampaignSummary | string, sortable = false) =>
    `px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em] whitespace-nowrap${sortable ? ' cursor-pointer hover:text-slate-600 select-none' : ''}`
  const td = 'px-4 py-3 text-sm text-slate-700 tabular-nums'

  // Chart data — top 8 campaigns by spend
  const topCampaigns = [...byCampaign]
    .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
    .slice(0, 8)
    .map((c) => ({
      name: c.campaign.length > 28 ? c.campaign.slice(0, 28) + '…' : c.campaign,
      spend: c.spend ?? 0,
      roas: c.roas ?? 0,
    }))

  // Platform donut data
  const donutData = byPlatform.map((p) => ({
    name: PLATFORM_LABEL[p.platform] ?? p.platform,
    value: p.spend ?? 0,
    platform: p.platform,
  }))

  return (
    <div className="space-y-6">
      {/* ── Header + Filters ── */}
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="text-lg font-semibold text-slate-900 flex-1">Dashboard</h1>
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
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* ── Spend & Revenue Trend ── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">
            Spend & Revenue Trend
          </h2>
        </div>
        {loading ? (
          <ChartSkeleton />
        ) : byDay.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No daily data for this period.
          </div>
        ) : (
          <div className="px-5 py-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={byDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + 'T00:00:00')
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  width={44}
                />
                <Tooltip content={<TrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="spend"
                  name="Spend"
                  stroke="#0e9eb0"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#0e9eb0' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 3"
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
                <Legend
                  iconType="line"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v) => <span className="text-slate-500">{v}</span>}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Charts row: Platform donut + Campaign bars ── */}
      {(byPlatform.length > 0 || byCampaign.length > 0) && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Platform spend distribution */}
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">
                Spend by Platform
              </h2>
            </div>
            <div className="p-5 flex items-center justify-center">
              {donutData.length === 0 ? (
                <p className="py-8 text-sm text-slate-400">No platform data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry) => (
                        <Cell
                          key={entry.platform}
                          fill={PLATFORM_COLOR[entry.platform] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [fmt.currency(v), 'Spend']}
                      contentStyle={{
                        fontSize: 12,
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        boxShadow: 'none',
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(v) => <span className="text-slate-600">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Top campaigns by spend */}
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">
                Top Campaigns by Spend
              </h2>
            </div>
            <div className="px-5 py-4">
              {topCampaigns.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No campaign data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(topCampaigns.length * 36, 160)}>
                  <BarChart
                    data={topCampaigns}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CampaignTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar
                      dataKey="spend"
                      name="Spend"
                      fill="#0e9eb0"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── By Platform table ── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">
            By Platform
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Platform', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM', 'Purchases', 'Revenue', 'ROAS', 'CPA'].map(
                  (h) => (
                    <th key={h} className={th(h)}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton cols={11} />
              ) : byPlatform.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400">
                    No data for this period.
                  </td>
                </tr>
              ) : (
                byPlatform.map((r) => (
                  <tr key={r.platform} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${PLATFORM_BADGE[r.platform] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {PLATFORM_LABEL[r.platform] ?? r.platform}
                      </span>
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

      {/* ── By Campaign (sortable) ── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">
            By Campaign
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className={th('campaign')}>Campaign</th>
                <th className={th('platform')}>Platform</th>
                {(
                  [
                    ['spend', 'Spend'],
                    ['impressions', 'Impressions'],
                    ['link_clicks', 'Clicks'],
                    ['ctr', 'CTR'],
                    ['cvr', 'CVR'],
                    ['cpa', 'CPA'],
                    ['roas', 'ROAS'],
                    ['purchases', 'Purchases'],
                    ['revenue', 'Revenue'],
                  ] as [keyof CampaignSummary, string][]
                ).map(([col, label]) => (
                  <th
                    key={col}
                    className={th(col, true)}
                    onClick={() => campaignSort.toggle(col)}
                  >
                    {label}
                    {campaignSort.key === col && (
                      <span className="ml-1 opacity-60">{campaignSort.dir === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton cols={11} />
              ) : campaignSort.sorted.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400">
                    No campaign data for this period.
                  </td>
                </tr>
              ) : (
                campaignSort.sorted.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td
                      className="px-4 py-3 text-sm font-medium text-slate-800 max-w-xs truncate"
                      title={r.campaign}
                    >
                      {r.campaign}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${PLATFORM_BADGE[r.platform] ?? 'bg-slate-100 text-slate-600'}`}
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
