import { useEffect, useState } from 'react'
import { api, TargetBase, TargetRead, UserRead } from '@/lib/api'

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

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-300'

  /**
   * Renders a numeric target field.
   * pct=true: the server stores [0,1] but the UI shows percentages (multiply/divide by 100).
   */
  const field = (key: keyof TargetBase, label: string, pct = false) => {
    const raw = form[key] as number | null | undefined
    const displayed = raw != null ? (pct ? parseFloat((raw * 100).toFixed(4)) : raw) : ''

    return (
      <div key={key}>
        <label className="block text-xs text-gray-600 mb-1">
          {label}
          {pct && <span className="text-gray-400 ml-1">(%)</span>}
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
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {field('cpa_cap', 'CPA Cap ($)')}
          {field('target_roas', 'Target ROAS')}
          {field('target_ctr', 'Target CTR', true)}
          {field('target_confirmation', 'Confirmation Rate', true)}
          {field('target_delivery', 'Delivery Rate', true)}
          {field('target_fulfillment', 'Fulfillment Rate', true)}
          {field('max_rto', 'Max RTO Rate', true)}
        </div>

        <div className="flex items-center justify-end gap-4">
          {saved && <span className="text-sm text-green-600">Saved!</span>}
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
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
          <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse h-48" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Targets</h2>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
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
