import { createContext, useContext, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('crediwise_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const saveSession = (token, userData) => {
    localStorage.setItem('crediwise_token', token)
    localStorage.setItem('crediwise_user', JSON.stringify(userData))
    setUser(userData)
  }

  const register = async (name, email, password) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/register', { name, email, password })
      saveSession(res.data.token, res.data.user)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' }
    } finally { setLoading(false) }
  }

  const login = async (email, password) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      saveSession(res.data.token, res.data.user)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' }
    } finally { setLoading(false) }
  }

  const logout = () => {
    localStorage.removeItem('crediwise_token')
    localStorage.removeItem('crediwise_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

