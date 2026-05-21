import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

// Adjunta token automáticamente
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('cf_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Redirige al login si el token expiró
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cf_token')
      localStorage.removeItem('cf_user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login    = (email, password) => api.post('/auth/login', new URLSearchParams({ username: email, password }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(r => r.data)
export const register = (data)            => api.post('/auth/register', data).then(r => r.data)
export const getMe          = ()               => api.get('/auth/me').then(r => r.data)
export const updateMe       = (data)           => api.put('/auth/me', data).then(r => r.data)
export const changePassword = (data)           => api.post('/auth/change-password', data).then(r => r.data)

// ── Causaciones ───────────────────────────────────────────────────────────────
export const getCausaciones  = (params = {}) => api.get('/causaciones/', { params }).then(r => r.data)
export const createCausacion = (data)        => api.post('/causaciones/', data).then(r => r.data)
export const updateCausacion = (id, data)    => api.put(`/causaciones/${id}`, data).then(r => r.data)
export const deleteCausacion = (id)          => api.delete(`/causaciones/${id}`)
export const getCausacion    = (id)          => api.get(`/causaciones/${id}`).then(r => r.data)

// ── Automatizaciones ──────────────────────────────────────────────────────────
export const getAutomatizaciones  = ()           => api.get('/automatizaciones/').then(r => r.data)
export const createAutomatizacion = (data)       => api.post('/automatizaciones/', data).then(r => r.data)
export const updateAutomatizacion = (id, data)   => api.put(`/automatizaciones/${id}`, data).then(r => r.data)
export const deleteAutomatizacion = (id)         => api.delete(`/automatizaciones/${id}`)
export const toggleAutomatizacion = (id, active) => api.patch(`/automatizaciones/${id}/toggle`, { active }).then(r => r.data)
export const runAutomatizacion    = (id)         => api.post(`/automatizaciones/${id}/run`).then(r => r.data)

// ── Historial ─────────────────────────────────────────────────────────────────
export const getHistorial = (params = {}) => api.get('/historial/', { params }).then(r => r.data)
export const getStats     = ()            => api.get('/historial/stats').then(r => r.data)

// ── Config ────────────────────────────────────────────────────────────────────
export const getAppStatus   = ()               => api.get('/status').then(r => r.data)
export const getConfig      = (platform)       => api.get(`/config/${platform}`).then(r => r.data)
export const saveConfig     = (platform, data) => api.put(`/config/${platform}`, data).then(r => r.data)
export const testConnection = (platform)       => api.post(`/config/${platform}/test`).then(r => r.data)
export const syncAll        = ()               => api.post('/config/sync/all').then(r => r.data)

// ── Export ────────────────────────────────────────────────────────────────────
export const exportHistorial   = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  window.open(`/api/export/historial${qs ? '?' + qs : ''}`, '_blank')
}
export const exportCausaciones = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  window.open(`/api/export/causaciones${qs ? '?' + qs : ''}`, '_blank')
}
export const exportCausacion = (id) => window.open(`/api/export/causacion/${id}`, '_blank')

// ── Sync preferences ──────────────────────────────────────────────────────────
export const saveSyncPrefs  = (data) => api.put('/config/sync-prefs', null, { params: data }).then(r => r.data)
export const getSyncPrefs   = ()     => api.get('/config/siigo').then(r => ({ sync_freq: r.data.sync_freq, sync_hour: r.data.sync_hour }))

// ── Password recovery ─────────────────────────────────────────────────────────
export const forgotPassword = (email)          => api.post('/auth/forgot-password', { email }).then(r => r.data)
export const resetPassword  = (token, new_password) => api.post('/auth/reset-password', { token, new_password }).then(r => r.data)
