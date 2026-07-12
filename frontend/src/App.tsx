import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import SignUpPage from '@/pages/SignUpPage'
import DashboardPage from '@/pages/DashboardPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import FunnelEntryPage from '@/pages/FunnelEntryPage'
import TargetsPage from '@/pages/TargetsPage'
import InvitesPage from '@/pages/InvitesPage'
import ProfilePage from '@/pages/ProfilePage'
import TeamsPage from '@/pages/TeamsPage'
import Layout from '@/components/Layout'
import { getTokenRole } from '@/utils/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = getTokenRole()
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="funnel" element={<FunnelEntryPage />} />
        <Route path="targets" element={<TargetsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="leaderboard" element={<RequireAdmin><LeaderboardPage /></RequireAdmin>} />
        <Route path="teams" element={<RequireAdmin><TeamsPage /></RequireAdmin>} />
        <Route path="invites" element={<RequireAdmin><InvitesPage /></RequireAdmin>} />
      </Route>
    </Routes>
  )
}
