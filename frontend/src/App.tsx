import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import FunnelEntryPage from '@/pages/FunnelEntryPage'
import TargetsPage from '@/pages/TargetsPage'
import Layout from '@/components/Layout'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="funnel" element={<FunnelEntryPage />} />
        <Route path="targets" element={<TargetsPage />} />
      </Route>
    </Routes>
  )
}
