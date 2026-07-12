/**
 * Decodes the JWT access token stored in localStorage without verification.
 * Used only for UI gating (role-based nav visibility).
 * The backend always verifies the token on protected endpoints.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadB64 = token.split('.')[1]
    if (!payloadB64) return null
    return JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function getTokenRole(): 'buyer' | 'admin' | null {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.role !== 'string') return null
  return payload.role as 'buyer' | 'admin'
}
