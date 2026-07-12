import { useEffect, useState } from 'react'
import { api, TargetBase, TargetRead, UserRead } from '@/lib/api'
import { CheckCircle } from 'lucide-react'

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors'

// ---------------------------------------------------------------------------
// TargetForm — reused for both team defaults and personal overrides
// ---------------------------------------------------------------------------

function TargetForm({
  title,
  description,
  initial,
  onSave,
  saving,
}: {
  title: string
  description?: string
  initial: TargetBase
  onSave: (data: TargetBase) => Promise<void>
  saving: boolean
}) {
  const [form, setForm] = useState<TargetBase>(initial)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(initial)
  }, [initial])

  /**
   * Renders a numeric target field.
   * pct=true: the server stores [0,1] but the UI shows percentages (multiply/divide by 100).
   */
  const field = (key: keyof TargetBase, label: string, pct = false) => {
    const raw = form[key] as number | null | undefined
    const displayed = raw != null ? (pct ? parseFloat((raw * 100).toFixed(4)) : raw) : ''

    return (
      <div key={key}>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          {label}
          {pct && <span className="text-slate-400 ml-1 font-normal">(%)</span>}
        </label>
        <input
          type="number"
          min={0}
          step={pct ? '0.1' : '0.01'}
          placeholder="—"
          value={displayed}
          onChange={(e) => {
            const v = e.target.value === '' ? null : Number(e.target.value)
            setForm((f) => ({ ...f, [key]: v != null && pct ? v / 100 : v }))
          }}
          className={inputCls}
        />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>

      <div className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {field('cpa_cap', 'CPA Cap ($)')}
            {field('target_roas', 'Target ROAS')}
            {field('target_ctr', 'Target CTR', true)}
            {field('target_confirmation', 'Confirmation Rate', true)}
            {field('target_delivery', 'Delivery Rate', true)}
            {field('target_fulfillment', 'Fulfillment Rate', true)}
            {field('max_rto', 'Max RTO Rate', true)}
          </div>

          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                Saved
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TargetsPage() {
  const [user, setUser] = useState<UserRead | null>(null)
  const [teamTarget, setTeamTarget] = useState<TargetBase>({})
  const [myTarget, setMyTarget] = useState<TargetBase>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingTeam, setSavingTeam] = useState(false)
  const [savingMine, setSavingMine] = useState(false)

  useEffect(() => {
    Promise.all([api.users.me(), api.targets.mine()])
      .then(async ([u, mine]: [UserRead, TargetRead | null]) => {
        setUser(u)
        setMyTarget(mine ?? {})
        if (u.role === 'admin') {
          try {
            const team = await api.targets.team()
            setTeamTarget(team ?? {})
          } catch {
            // team target may not exist yet — leave as empty defaults
          }
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const saveTeam = async (data: TargetBase) => {
    setSavingTeam(true)
    try {
      setTeamTarget(await api.targets.updateTeam(data))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingTeam(false)
    }
  }

  const saveMine = async (data: TargetBase) => {
    setSavingMine(true)
    try {
      setMyTarget(await api.targets.updateMine(data))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingMine(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-48"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Targets</h1>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {user?.role === 'admin' && (
        <TargetForm
          title="Team Defaults"
          description="These values apply to all buyers who haven't set a personal override."
          initial={teamTarget}
          onSave={saveTeam}
          saving={savingTeam}
        />
      )}

      <TargetForm
        title={user?.role === 'admin' ? 'Your Personal Overrides' : 'My Targets'}
        description={
          user?.role === 'admin'
            ? 'Your personal override values. Leave a field blank to use the team default.'
            : 'Override the team defaults for your account. Leave blank to inherit from the admin.'
        }
        initial={myTarget}
        onSave={saveMine}
        saving={savingMine}
      />
    </div>
  )
}
