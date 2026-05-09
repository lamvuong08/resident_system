export type StoredUser = {
  email?: string
  role?: string
  name?: string
  phone?: string
  status?: string
}

const STORAGE_KEYS = {
  token: 'token',
  role: 'role',
  user: 'user',
} as const

export const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.token)
  localStorage.removeItem(STORAGE_KEYS.user)
  localStorage.removeItem(STORAGE_KEYS.role)
}

export const getStoredUser = (): StoredUser => {
  const rawUser = localStorage.getItem(STORAGE_KEYS.user)
  if (!rawUser) {
    return {}
  }

  try {
    return JSON.parse(rawUser) as StoredUser
  } catch {
    return {}
  }
}

export const getStoredRole = (): string => {
  const roleInStorage = localStorage.getItem(STORAGE_KEYS.role)
  if (roleInStorage && roleInStorage.trim()) {
    return roleInStorage.toUpperCase()
  }

  const user = getStoredUser()
  return (user.role || '').toUpperCase()
}

export const hasToken = (): boolean => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  return Boolean(token)
}

export const setAuthSession = (token: string, user: StoredUser) => {
  localStorage.setItem(STORAGE_KEYS.token, token)
  if (user.role) {
    localStorage.setItem(STORAGE_KEYS.role, user.role)
  }
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
}

export const setStoredUser = (user: StoredUser) => {
  if (user.role) {
    localStorage.setItem(STORAGE_KEYS.role, user.role)
  }
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
}
