import { useEffect, useState } from 'react'
import { api, FunnelEntryCreate, FunnelEntryRead } from '@/lib/api'
import { defaultDateRange, fmt, today } from '@/lib/fmt'
import { ArrowRight } from 'lucide-react'

const SOURCES = ['Meta', 'TikTok', 'Snapchat', 'Organic', 'Other']

const EMPTY: FunnelEntryCreate = {
  date: today(),
  store_or_lp: '',
  source: 'Meta',
  placed_orders: 0,
  confirmed_orders: null,
  shipped_orders: null,
  delivered_orders: null,
  cancelled_orders: null,
  basket_value: null,
  items: null,
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors'

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-slate-300 text-xs">—</span>
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
        status === 'On Track'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'bg-red-50 text-red-600 border border-red-100'
      }`}
    >
      {status}
    </span>
  )
}

export default function FunnelEntryPage() {
  const range = defaultDateRange()
  const [form, setForm] = useState<FunnelEntryCreate>(EMPTY)
  const [entries, setEntries] = useState<FunnelEntryRead[]>([])
  const [startDate, setStartDate] = useState(range.start_date)
  const [endDate, setEndDate] = useState(range.end_date)
  const [saving, setSaving] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadEntries = () => {
    setLoadingList(true)
    api.funnel
      .list({ start_date: startDate, end_date: endDate })
      .then(setEntries)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingList(false))
  }

  useEffect(() => {
    loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  const set = (field: keyof FunnelEntryCreate, value: string | number | null) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.store_or_lp.trim()) {
      setError('Store / LP name is required')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.funnel.upsert(form)
      setSuccess('Entry saved.')
      setForm({ ...EMPTY, date: form.date })
      loadEntries()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this entry?')) return
    try {
      await api.funnel.delete(id)
      setEntries((prev) => prev.filter((r) => r.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const numField = (
    field: keyof FunnelEntryCreate,
    label: string,
    required = false,
    step = '1',
  ) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type="number"
        min={0}
        step={step}
        value={(form[field] as number | null) ?? ''}
        onChange={(e) => set(field, e.target.value === '' ? null : Number(e.target.value))}
        className={inputCls}
      />
    </div>
  )

  const th =
    'px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em] whitespace-nowrap'
  const td = 'px-4 py-3 text-sm text-slate-700 tabular-nums'

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Funnel Entry</h1>

      {/* ── Entry Form ── */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">
            Log Daily Store / LP Orders
          </h2>
        </div>
        <div className="p-5">
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2.5">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identity fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Date<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Store / LP Name<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Store - Main"
                  value={form.store_or_lp}
                  onChange={(e) => set('store_or_lp', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Source<span className="text-red-400 ml-0.5">*</span>
                </label>
                <select
                  value={form.source}
                  onChange={(e) => set('source', e.target.value)}
                  className={inputCls}
                >
                  {SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {numField('placed_orders', 'Placed Orders', true)}
              {numField('confirmed_orders', 'Confirmed Orders')}
              {numField('shipped_orders', 'Shipped Orders')}
              {numField('delivered_orders', 'Delivered Orders')}
            </div>

            {/* Basket + cancellations */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {numField('cancelled_orders', 'Cancelled Orders')}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Basket Value ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(form.basket_value as number | null) ?? ''}
                  onChange={(e) =>
                    set('basket_value', e.target.value === '' ? null : Number(e.target.value))
                  }
                  className={inputCls}
                />
              </div>
              {numField('items', 'Total Items')}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Entries List ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em] flex-1">
            Recent Entries
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors"
            />
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[
                  'Date',
                  'Store / LP',
                  'Source',
                  'Placed',
                  'Confirmed',
                  'Delivered',
                  'Conf%',
                  'Deliv%',
                  'RTO%',
                  'Avg Basket',
                  '',
                ].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingList ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400">
                    No entries for this period. Add your first one above.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">{e.date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{e.store_or_lp}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{e.source}</td>
                    <td className={td}>{fmt.num(e.placed_orders)}</td>
                    <td className={td}>{fmt.num(e.confirmed_orders)}</td>
                    <td className={td}>{fmt.num(e.delivered_orders)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.metrics.confirmation_status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.metrics.delivery_status} />
                    </td>
                    <td className={td}>{fmt.pct(e.metrics.rto_rate)}</td>
                    <td className={td}>{fmt.currency(e.metrics.avg_basket, 2)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
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
