import axios from 'axios'

// ── Debug mode ────────────────────────────────────────────────────────────────
// Enable by running in the browser console:
//   localStorage.setItem('crediwise_debug', '1')   // then refresh
const isDebug = () =>
  typeof window !== 'undefined' &&
  window.localStorage?.getItem('crediwise_debug') === '1'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // Send cookies on every request — necessary if/when sessions are added
  // and harmless today (CORS allows credentials on the backend).
  withCredentials: true,
})

api.interceptors.request.use(cfg => {
  if (isDebug()) {
    // eslint-disable-next-line no-console
    console.log('→ API', cfg.method?.toUpperCase(), cfg.url, cfg.data ?? '')
  }
  return cfg
})

api.interceptors.response.use(
  res => {
    if (isDebug()) {
      // eslint-disable-next-line no-console
      console.log('← API', res.status, res.config.url, res.data)
    }
    return res
  },
  err => {
    if (isDebug()) {
      // eslint-disable-next-line no-console
      console.warn('✗ API', err.response?.status, err.config?.url,
                   err.response?.data || err.message)
    }
    return Promise.reject(err)
  }
)

export async function runAudit(payload) {
  const { data } = await api.post('/audit', payload)
  if (!data.success) throw new Error(data.error)
  return data.data
}

export async function runPersona(payload) {
  const { data } = await api.post('/persona', payload)
  if (!data.success) throw new Error(data.error)
  return data.data
}

export async function healthCheck() {
  const { data } = await api.get('/health')
  return data.data
}

export default api
