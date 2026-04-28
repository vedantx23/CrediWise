import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crediwise_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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
