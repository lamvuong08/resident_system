import { useCallback, useEffect, useState } from 'react'
import type { ResidentNotification } from '../types/notification'
import { extractApiError } from '../utils/api'
import { fetchMyNotifications, markMyNotificationRead, markMyNotificationsReadAll } from '../utils/notificationApi'

export function useResidentNotifications() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ResidentNotification[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchMyNotifications()
      setItems(rows)
    } catch (err) {
      setItems([])
      setError(extractApiError(err, 'Không thể tải danh sách thông báo.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: number) => {
    await markMyNotificationRead(id)
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)))
  }, [])

  const markAllAsRead = useCallback(async () => {
    await markMyNotificationsReadAll()
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })))
  }, [])

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    loading,
    error,
    items,
    refresh,
    markAsRead,
    markAllAsRead,
    removeItem,
  }
}
