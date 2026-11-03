import { useNotification } from '../context/NotificationContext'

export function useResidentNotifications() {
  const {
    notifications,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotification()

  return {
    loading,
    error: null,
    items: notifications,
    refresh: refreshNotifications,
    markAsRead,
    markAllAsRead,
    removeItem: removeNotification,
  }
}
