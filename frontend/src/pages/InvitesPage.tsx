import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { InviteToken, InviteTokenCreated } from '@/types'
import { Copy, Check, UserPlus } from 'lucide-react'

function tokenStatus(invite: InviteToken): { label: string; cls: string } {
  if (invite.used_at)
    return { label: 'Used', cls: 'text-slate-400 bg-slate-50 border border-slate-100' }
  if (new Date(invite.expires_at) <= new Date())
    return { label: 'Expired', cls: 'text-red-500 bg-red-50 border border-red-100' }
  return { label: 'Pending', cls: 'text-emerald-600 bg-emerald-50 border border-emerald-100' }
}

export default function InvitesPage() {
  const queryClient = useQueryClient()
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const { data: invites = [], isLoading } = useQuery<InviteToken[]>({
    queryKey: ['invites'],
    queryFn: async () => {
      const { data } = await api.get<InviteToken[]>('/invites/')
      return data
    },
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<InviteTokenCreated>('/invites/')
      return data
    },
    onSuccess: (invite) => {
      const url = `${window.location.origin}/signup?token=${invite.token}`
      queryClient.invalidateQueries({ queryKey: ['invites'] })
      setNewInviteUrl(url)
      setCopiedUrl(null)
    },
  })

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      // clipboard API unavailable (non-HTTPS or sandboxed); silent fallback
    }
  }

  const th =
    'px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em]'
  const td = 'px-4 py-3 text-sm text-slate-700'

  return (
    <div className="max-w-3xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Invite Links</h1>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {generateMutation.isPending ? 'Generating…' : 'Generate link'}
        </button>
      </div>

      {/* ── New invite banner ── */}
      {newInviteUrl && (
        <div className="mb-6 p-4 bg-brand-50 border border-brand-100 rounded-xl">
          <p className="text-sm font-medium text-brand-800 mb-2.5">
            New invite link — valid for 7 days:
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={newInviteUrl}
              className="flex-1 border border-brand-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none min-w-0"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => copyToClipboard(newInviteUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-brand-200 rounded-lg bg-white text-brand-700 hover:bg-brand-50 transition-colors shrink-0"
            >
              {copiedUrl === newInviteUrl ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {generateMutation.isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 mb-4">
          Failed to generate invite. Please try again.
        </p>
      )}

      {/* ── Invites table ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-5 bg-slate-100 rounded-lg" />
          ))}
        </div>
      ) : invites.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center">
          <UserPlus className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No invite links yet. Generate one above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className={th}>Status</th>
                <th className={th}>Used by</th>
                <th className={th}>Created</th>
                <th className={th}>Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.map((invite) => {
                const { label, cls } = tokenStatus(invite)
                return (
                  <tr key={invite.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>
                        {label}
                      </span>
                    </td>
                    <td className={td}>{invite.used_by_email ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">
                      {new Date(invite.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
