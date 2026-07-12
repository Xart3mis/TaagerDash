import { useEffect, useState } from 'react'
import { Users, Plus, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { api, TeamRead, UserRead } from '@/lib/api'

const inputCls =
  'border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors'

// ---------------------------------------------------------------------------
// Team card
// ---------------------------------------------------------------------------

function TeamCard({
  team,
  allUsers,
  onAddMember,
  onRemoveMember,
  onDelete,
  onRename,
}: {
  team: TeamRead
  allUsers: UserRead[]
  onAddMember: (teamId: number, userId: number) => Promise<void>
  onRemoveMember: (teamId: number, userId: number) => Promise<void>
  onDelete: (teamId: number) => Promise<void>
  onRename: (teamId: number, name: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(team.name)
  const [addUserId, setAddUserId] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const memberIds = new Set(team.members.map((m) => m.id))
  const eligibleUsers = allUsers.filter((u) => !memberIds.has(u.id))

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim() || editName === team.name) { setEditing(false); return }
    setBusy(true)
    setError(null)
    try {
      await onRename(team.id, editName.trim())
      setEditing(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rename failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (addUserId === '') return
    setBusy(true)
    setError(null)
    try {
      await onAddMember(team.id, Number(addUserId))
      setAddUserId('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        {editing ? (
          <form onSubmit={handleRename} className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={`${inputCls} py-1.5 flex-1`}
            />
            <button
              type="submit"
              disabled={busy}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditName(team.name) }}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm truncate">{team.name}</h3>
              <span className="text-[11px] text-slate-400 shrink-0">
                {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setEditing(true); setEditName(team.name) }}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md hover:bg-slate-50 transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => onDelete(team.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                title="Delete team"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Members list */}
        {team.members.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No members yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 -mx-5 px-5">
            {team.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                </div>
                <button
                  onClick={() => onRemoveMember(team.id, m.id)}
                  className="ml-3 p-1.5 text-slate-300 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors shrink-0"
                  title={`Remove ${m.full_name}`}
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add member */}
        {eligibleUsers.length > 0 && (
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value === '' ? '' : Number(e.target.value))}
              className={`${inputCls} flex-1`}
            >
              <option value="">Add a member…</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy || addUserId === ''}
              className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamRead[]>([])
  const [allUsers, setAllUsers] = useState<UserRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([api.teams.list(), api.users.list()])
      .then(([t, u]) => {
        setTeams(t)
        setAllUsers(u)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setCreating(true)
    try {
      const team = await api.teams.create({ name: newTeamName.trim() })
      setTeams((prev) => [...prev, team])
      setNewTeamName('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(teamId: number) {
    if (!confirm('Delete this team? Members will not be removed from the platform.')) return
    try {
      await api.teams.delete(teamId)
      setTeams((prev) => prev.filter((t) => t.id !== teamId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function handleRename(teamId: number, name: string) {
    const updated = await api.teams.update(teamId, { name })
    setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)))
  }

  async function handleAddMember(teamId: number, userId: number) {
    const updated = await api.teams.addMember(teamId, userId)
    setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)))
  }

  async function handleRemoveMember(teamId: number, userId: number) {
    const updated = await api.teams.removeMember(teamId, userId)
    setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Teams</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Create team */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">
            Create Team
          </h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleCreate} className="flex items-center gap-3">
            <input
              type="text"
              placeholder="e.g. Acquisition Team"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <button
              type="submit"
              disabled={creating || !newTeamName.trim()}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>
      </div>

      {/* Teams list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No teams yet. Create the first one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              allUsers={allUsers}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}
        </div>
      )}
    </div>
  )
}
