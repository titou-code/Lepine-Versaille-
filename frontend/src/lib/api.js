const API_BASE = '/api'

let token = null
let refreshPromise = null

export function setToken(t) { token = t }
export function getToken() { return token }
export function clearToken() { token = null }

export async function tryRefresh() {
  if (refreshPromise) return refreshPromise
  refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  }).then(async res => {
    refreshPromise = null
    if (!res.ok) throw new Error('refresh failed')
    const data = await res.json()
    token = data.token
    return true
  }).catch(() => {
    refreshPromise = null
    token = null
    return false
  })
  return refreshPromise
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })

  if (res.status === 401 && !path.includes('/auth/')) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${token}`
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({}))
        throw new Error(body.error || `Erreur ${retry.status}`)
      }
      return retry.json()
    }
    window.dispatchEvent(new Event('auth:expired'))
    throw new Error('Session expirée')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Erreur ${res.status}`)
  }
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
}
