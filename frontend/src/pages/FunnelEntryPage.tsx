import { useEffect, useState } from 'react'
import { api, FunnelEntryCreate, FunnelEntryRead } from '@/lib/api'
import { defaultDateRange, fmt, today } from '@/lib/fmt'

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

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        status === 'On Track' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
      setForm({ ...EMPTY, date: form.date }) // keep the date for quick multi-row entry
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

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  const numField = (
    field: keyof FunnelEntryCreate,
    label: string,
    required = false,
    step = '1',
  ) => (
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
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

  const th = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide'
  const td = 'px-4 py-3 text-sm text-gray-700'

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Funnel Entry</h2>

      {/* Entry Form */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Log Daily Store / LP Orders
        </h3>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identity fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Date<span className="text-red-500 ml-0.5">*</span>
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
              <label className="block text-xs text-gray-600 mb-1">
                Store / LP Name<span className="text-red-500 ml-0.5">*</span>
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
              <label className="block text-xs text-gray-600 mb-1">
                Source<span className="text-red-500 ml-0.5">*</span>
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
              <label className="block text-xs text-gray-600 mb-1">Basket Value ($)</label>
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
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex-1">
            Recent Entries
          </h3>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <span className="text-gray-400 text-xs">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
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
            <tbody className="divide-y divide-gray-100">
              {loadingList ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-sm text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">
                    No entries for this period.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className={`${td} text-gray-500`}>{e.date}</td>
                    <td className={`${td} font-medium text-gray-800`}>{e.store_or_lp}</td>
                    <td className={td}>{e.source}</td>
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
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
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
