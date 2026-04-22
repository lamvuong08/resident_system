import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { clearAuthStorage, getStoredRole, getStoredUser } from './authStorage'

const isAuthRoute = (path: string) => {
  return (
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot') ||
    path.startsWith('/reset') ||
    path.startsWith('/confirm-register')
  )
}

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')

  if (token && config.headers) {
    const headers = config.headers as unknown as Record<string, unknown>
    // Axios headers may expose a `set` method (AxiosHeaders) or be a plain object.
    const headersWithSet = headers as unknown as { set?: (k: string, v: string) => void }
    if (typeof headersWithSet.set === 'function') {
      headersWithSet.set('Authorization', `Bearer ${token}`)
    } else {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const path = window.location.pathname
    const isAuthPath = isAuthRoute(path)

    if (status === 401 && !isAuthPath) {
      clearAuthStorage()
      window.location.href = '/login'
    }

    if (status === 403 && !isAuthPath) {
      const role = getStoredRole() || (getStoredUser().role || '').toUpperCase()
      const isAdmin = role.includes('ADMIN')

      if (path.startsWith('/admin') && !isAdmin) {
        window.location.href = '/user'
      } else if (path.startsWith('/user') && isAdmin) {
        window.location.href = '/admin'
      }
    }

    return Promise.reject(error)
  }
)

export const extractApiError = (err: unknown, fallback = 'Có lỗi xảy ra') => {
  const maybe = err as { response?: { data?: unknown }; message?: unknown }
  const data = maybe.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error
  }
  if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message
  return fallback
}

export default api