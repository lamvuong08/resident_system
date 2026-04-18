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

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
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

export const extractApiError = (err: any, fallback = 'Có lỗi xảy ra') => {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) return data.message
    if (typeof data.error === 'string' && data.error.trim()) return data.error
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message
  return fallback
}

export default api