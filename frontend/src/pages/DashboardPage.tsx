// Phase 2 will wire this to the aggregation API endpoints.
// For now: structural placeholder with the expected sections.
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>

      <section className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Overall Total</h3>
        <p className="text-gray-400 text-sm">Coming in Phase 2 — aggregation endpoints.</p>
      </section>

      <section className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">By Platform</h3>
        <p className="text-gray-400 text-sm">Meta · TikTok · Snapchat breakdown.</p>
      </section>

      <section className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">By Campaign</h3>
        <p className="text-gray-400 text-sm">Campaign-level KPI table.</p>
      </section>
    </div>
  )
}
