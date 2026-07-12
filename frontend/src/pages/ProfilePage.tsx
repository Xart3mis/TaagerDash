import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { api, UserRead } from '@/lib/api'

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors'

// ---------------------------------------------------------------------------
// Generic form section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SaveFeedback({ saved }: { saved: boolean }) {
  if (!saved) return null
  return (
    <span className="flex items-center gap-1.5 text-sm text-emerald-600">
      <CheckCircle className="w-4 h-4" />
      Saved
    </span>
  )
}

function ErrorMsg({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
      {msg}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const [user, setUser] = useState<UserRead | null>(null)
  const [loading, setLoading] = useState(true)

  // Display name form
  const [fullName, setFullName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Email change form
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Password change form
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSaved, setPwdSaved] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  useEffect(() => {
    api.users
      .me()
      .then((u) => {
        setUser(u)
        setFullName(u.full_name)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return
    setNameSaving(true)
    setNameError(null)
    try {
      const updated = await api.users.updateProfile({ full_name: fullName.trim() })
      setUser(updated)
      setFullName(updated.full_name)
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2500)
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setNameSaving(false)
    }
  }

  const handleEmailSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !emailPassword) return
    setEmailSaving(true)
    setEmailError(null)
    try {
      const updated = await api.users.changeEmail({
        current_password: emailPassword,
        new_email: newEmail,
      })
      setUser(updated)
      setNewEmail('')
      setEmailPassword('')
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 2500)
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : 'Email change failed')
    } finally {
      setEmailSaving(false)
    }
  }

  const handlePwdSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd !== confirmPwd) {
      setPwdError('New passwords do not match')
      return
    }
    if (newPwd.length < 8) {
      setPwdError('New password must be at least 8 characters')
      return
    }
    setPwdSaving(true)
    setPwdError(null)
    try {
      await api.users.changePassword({
        current_password: currentPwd,
        new_password: newPwd,
      })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setPwdSaved(true)
      setTimeout(() => setPwdSaved(false), 2500)
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : 'Password change failed')
    } finally {
      setPwdSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-32" />
        ))}
      </div>
    )
  }

  const btnCls =
    'bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors'

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-lg font-semibold text-slate-900">Profile</h1>

      {/* Account info (read-only) */}
      <Section title="Account">
        <div className="space-y-1 text-sm text-slate-600">
          <div className="flex gap-2">
            <span className="text-slate-400 w-20 shrink-0">Email</span>
            <span className="font-medium text-slate-800 tabular-nums">{user?.email}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400 w-20 shrink-0">Role</span>
            <span className="font-medium text-slate-800 capitalize">{user?.role}</span>
          </div>
        </div>
      </Section>

      {/* Display name */}
      <Section
        title="Display Name"
        description="This name appears in the leaderboard and across the app."
      >
        <form onSubmit={handleNameSave} className="space-y-3">
          <ErrorMsg msg={nameError} />
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className={inputCls}
          />
          <div className="flex items-center justify-end gap-3">
            <SaveFeedback saved={nameSaved} />
            <button type="submit" disabled={nameSaving} className={btnCls}>
              {nameSaving ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
      </Section>

      {/* Change email */}
      <Section
        title="Change Email"
        description="Requires your current password to confirm."
      >
        <form onSubmit={handleEmailSave} className="space-y-3">
          <ErrorMsg msg={emailError} />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">New email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Current password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <SaveFeedback saved={emailSaved} />
            <button type="submit" disabled={emailSaving} className={btnCls}>
              {emailSaving ? 'Updating…' : 'Update email'}
            </button>
          </div>
        </form>
      </Section>

      {/* Change password */}
      <Section
        title="Change Password"
        description="New password must be at least 8 characters."
      >
        <form onSubmit={handlePwdSave} className="space-y-3">
          <ErrorMsg msg={pwdError} />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Current password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">New password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Min. 8 characters"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm new password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Repeat new password"
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <SaveFeedback saved={pwdSaved} />
            <button type="submit" disabled={pwdSaving} className={btnCls}>
              {pwdSaving ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      </Section>
    </div>
  )
}
