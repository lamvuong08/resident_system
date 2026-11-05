import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { Client, type IMessage } from '@stomp/stompjs'
import { notification as antNotification, Button } from 'antd'
import { ArrowRightOutlined, NotificationOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { hasToken, getStoredRole } from '../utils/authStorage'
import {
  fetchMyNotifications,
  markMyNotificationRead,
  markMyNotificationsReadAll,
  fetchUnreadCount,
} from '../utils/notificationApi'
import type { ResidentNotification, RealtimeNotificationPayload } from '../types/notification'
import { formatNotificationDate, parseNotificationDate } from '../utils/notificationTime'
import '../styles/resident-notifications.css'

interface NotificationContextType {
  notifications: ResidentNotification[]
  unreadCount: number
  isConnected: boolean
  requestUpdatesVersion: number
  loading: boolean
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  removeNotification: (id: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const WS_URL = 'ws://localhost:8080/ws'

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])
  const [notifications, setNotifications] = useState<ResidentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [requestUpdatesVersion, setRequestUpdatesVersion] = useState(0)
  const clientRef = useRef<Client | null>(null)
  const initialLoadedRef = useRef<boolean>(false)
  const receivedIdsRef = useRef(new Set<number>())
  const unreadIdsRef = useRef(new Set<number>())
  const readingIdsRef = useRef(new Set<number>())
  const itemsRef = useRef<ResidentNotification[]>([])
  const versionsRef = useRef(new Map<number, number>())
  const versionRef = useRef(0)
  const refreshIdRef = useRef(0)

  // Đồng bộ danh sách và đếm số chưa đọc qua REST API (Single source of truth)
  const refreshNotifications = useCallback(async () => {
    if (!hasToken()) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const sessionToken = localStorage.getItem('token')
    const refreshId = ++refreshIdRef.current
    const startVersion = versionRef.current
    setLoading(true)
    try {
      const [list, count] = await Promise.all([
        fetchMyNotifications(),
        fetchUnreadCount(),
      ])
      if (sessionToken !== localStorage.getItem('token') || refreshId !== refreshIdRef.current) return
      // Preserve socket arrivals and read actions made while this REST request was pending.
      const map = new Map(list.map((item) => [item.id, item]))
      itemsRef.current.forEach((item) => {
        const serverItem = map.get(item.id)
        if (!serverItem || (versionsRef.current.get(item.id) ?? 0) > startVersion) {
          map.set(item.id, item)
        } else if (item.actionUrl) {
          map.set(item.id, { ...serverItem, actionUrl: item.actionUrl })
        }
      })
      const combined = Array.from(map.values()).sort((a, b) =>
        (parseNotificationDate(b.createdAt)?.getTime() ?? 0) - (parseNotificationDate(a.createdAt)?.getTime() ?? 0)
      )
      itemsRef.current = combined
      unreadIdsRef.current = new Set(combined.filter((item) => !item.isRead).map((item) => item.id))
      setNotifications(combined)
      const unreadInList = list.filter((i) => !i.isRead).length
      setUnreadCount(Math.max(0, (count > 0 ? count : unreadInList) + unreadIdsRef.current.size - unreadInList))
    } catch {
      // Giữ nguyên dữ liệu hiện có nếu API gặp lỗi tạm thời
    } finally {
      if (sessionToken === localStorage.getItem('token') && refreshId === refreshIdRef.current) setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: number) => {
    if (readingIdsRef.current.has(id)) return
    readingIdsRef.current.add(id)
    const sessionToken = localStorage.getItem('token')
    try {
      await markMyNotificationRead(id)
      if (sessionToken !== localStorage.getItem('token')) return
      versionsRef.current.set(id, ++versionRef.current)
      itemsRef.current = itemsRef.current.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      setNotifications(itemsRef.current)
      if (unreadIdsRef.current.delete(id)) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // Không chặn người dùng nếu API lỗi
    } finally {
      readingIdsRef.current.delete(id)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    const sessionToken = localStorage.getItem('token')
    const ids = new Set(unreadIdsRef.current)
    try {
      await markMyNotificationsReadAll()
      if (sessionToken !== localStorage.getItem('token')) return
      itemsRef.current = itemsRef.current.map((n) => {
        if (!ids.has(n.id)) return n
        versionsRef.current.set(n.id, ++versionRef.current)
        return { ...n, isRead: true }
      })
      setNotifications(itemsRef.current)
      let readCount = 0
      ids.forEach((id) => { if (unreadIdsRef.current.delete(id)) ++readCount })
      setUnreadCount((prev) => Math.max(0, prev - readCount))
    } catch {
      // Không chặn
    }
  }, [])

  const removeNotification = useCallback((id: number) => {
    itemsRef.current = itemsRef.current.filter((item) => item.id !== id)
    setNotifications(itemsRef.current)
    if (unreadIdsRef.current.delete(id)) setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  // Khởi tạo kết nối STOMP duy nhất cho toàn bộ app
  useEffect(() => {
    if (!token) {
      if (clientRef.current) {
        clientRef.current.deactivate()
        clientRef.current = null
      }
      setIsConnected(false)
      setNotifications([])
      setUnreadCount(0)
      initialLoadedRef.current = false
      receivedIdsRef.current.clear()
      unreadIdsRef.current.clear()
      readingIdsRef.current.clear()
      itemsRef.current = []
      versionsRef.current.clear()
      ++refreshIdRef.current
      setLoading(false)
      antNotification.destroy()
      return
    }

    // Tải dữ liệu ban đầu 1 lần khi đăng nhập
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true
      void refreshNotifications()
    }

    // Khởi tạo STOMP Client
    const stompClient = new Client({
      brokerURL: WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (msg: string) => {
        if (import.meta.env.DEV && !msg.includes('PING') && !msg.includes('PONG')) {
          console.debug('[STOMP]', msg)
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        if (clientRef.current !== stompClient || token !== localStorage.getItem('token')) return
        setIsConnected(true)
        setRequestUpdatesVersion((version) => version + 1)
        console.info('[STOMP] Connected to WebSocket successfully')

        // Subscribe hàng đợi riêng của người dùng
        stompClient.subscribe('/user/queue/notifications', (message: IMessage) => {
          if (clientRef.current !== stompClient || token !== localStorage.getItem('token')) return
          try {
            const payload: RealtimeNotificationPayload = JSON.parse(message.body)
            // REST detail/read APIs use NotificationReceiver.id, never Notification.id.
            const resolvedId = payload.receiverId
            if (!Number.isSafeInteger(resolvedId) || resolvedId <= 0) {
              void refreshNotifications()
              return
            }
            if (receivedIdsRef.current.has(resolvedId)) return
            receivedIdsRef.current.add(resolvedId)

            const newItem: ResidentNotification = {
              id: resolvedId,
              title: payload.title || 'Thông báo mới',
              content: payload.content || '',
              type: payload.type || 'GENERAL',
              isRead: Boolean(payload.isRead),
              createdAt: payload.createdAt || null,
              actionUrl: payload.actionUrl,
            }

            // Cập nhật danh sách thông báo và số chưa đọc
            const existing = itemsRef.current.find((item) => item.id === resolvedId)
            if (existing?.isRead) newItem.isRead = true
            versionsRef.current.set(resolvedId, ++versionRef.current)
            itemsRef.current = [newItem, ...itemsRef.current.filter((item) => item.id !== resolvedId)]
            setNotifications(itemsRef.current)
            if (!newItem.isRead && !unreadIdsRef.current.has(resolvedId)) {
              unreadIdsRef.current.add(resolvedId)
              setUnreadCount((prev) => prev + 1)
            }

            // Hiển thị Toast Ant Design ở góc phải màn hình
            const toastKey = `noti_${resolvedId}`
            antNotification.open({
              key: toastKey,
              className: 'realtime-notification',
              icon: <NotificationOutlined className="realtime-notification__icon" />,
              title: newItem.title,
              description: (
                <div className="realtime-notification__body">
                  <div className="realtime-notification__content">{newItem.content}</div>
                  <div className="realtime-notification__footer">
                    <span className="realtime-notification__time">{formatNotificationDate(newItem.createdAt)}</span>
                    <Button
                      type="link"
                      size="small"
                      className="realtime-notification__details"
                      onClick={() => {
                        antNotification.destroy(toastKey)
                        // The existing detail modal marks this receiver as read.
                        const detailUrl = `/user/notifications/${resolvedId}`
                        if (newItem.actionUrl && newItem.actionUrl !== detailUrl) {
                          void markAsRead(resolvedId)
                        }
                        navigateRef.current(newItem.actionUrl || detailUrl)
                      }}
                    >
                      Xem chi tiết <ArrowRightOutlined />
                    </Button>
                  </div>
                </div>
              ),
              placement: 'topRight',
              duration: 6,
            })
          } catch (e) {
            console.error('[STOMP] Error parsing notification message', e)
          }
        })

        const role = getStoredRole()
        if (role.includes('ADMIN') || role.includes('STAFF')) {
          stompClient.subscribe('/user/queue/request-updates', () => {
            if (clientRef.current === stompClient && token === localStorage.getItem('token')) {
              setRequestUpdatesVersion((version) => version + 1)
            }
          })
        }

        // Đồng bộ REST để bù đắp bất kỳ thông báo nào bị gửi trong lúc reconnect
        void refreshNotifications()
      },
      onDisconnect: () => {
        setIsConnected(false)
        console.warn('[STOMP] Disconnected from WebSocket')
      },
      onStompError: (frame) => {
        console.error('[STOMP] Broker error:', frame.headers['message'], frame.body)
      },
      onWebSocketError: (event) => {
        console.error('[STOMP] WebSocket transport error', event)
      },
    })

    clientRef.current = stompClient
    stompClient.activate()

    const handleOnline = () => {
      console.info('[STOMP] Network restored, syncing and reconnecting...')
      if (clientRef.current && !clientRef.current.active) {
        clientRef.current.activate()
      } else {
        void refreshNotifications()
      }
    }

    const handleOffline = () => {
      console.warn('[STOMP] Network lost (offline)')
      setIsConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (clientRef.current) {
        clientRef.current.deactivate()
        clientRef.current = null
      }
      setIsConnected(false)
    }
  }, [token, refreshNotifications, markAsRead])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        requestUpdatesVersion,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
