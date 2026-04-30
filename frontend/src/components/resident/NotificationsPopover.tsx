import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, List, Skeleton, Tabs, Tag, Typography } from 'antd'
import type { TabsProps } from 'antd'
import type { DashboardNotification } from '../../types/residentDashboard'
import { getResidentNotifications } from '../../utils/residentDashboard'

type NotificationsPopoverProps = {
  open: boolean
  onViewAll: () => void
  onUnreadCountChange?: (count: number) => void
}

const formatDate = (value: string | null) => {
  if (!value) return 'Chưa rõ thời gian'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const NotificationsPopover = ({ open, onViewAll, onUnreadCountChange }: NotificationsPopoverProps) => {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<DashboardNotification[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!open) return
      setLoading(true)
      try {
        const rows = await getResidentNotifications()
        if (mounted) {
          setItems(rows)
          onUnreadCountChange?.(rows.filter((item) => !item.isRead).length)
        }
      } catch {
        if (mounted) {
          setItems([])
          onUnreadCountChange?.(0)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [open])

  const filteredItems = useMemo(() => {
    if (activeTab === 'unread') return items.filter((item) => !item.isRead)
    return items
  }, [activeTab, items])

  const latest = useMemo(() => filteredItems.slice(0, 8), [filteredItems])
  const emptyMessage = activeTab === 'unread' ? 'Chưa có thông báo chưa đọc' : 'Chưa có thông báo'
  const tabItems: TabsProps['items'] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
  ]

  return (
    <div className="header-notifications-popover">
      <div className="header-notifications-popover__title">
        <Typography.Text strong>Thông báo</Typography.Text>
      </div>

      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={(key) => setActiveTab(key as 'all' | 'unread')}
        size="small"
      />

      {loading ? (
        <div style={{ padding: 12 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : latest.length === 0 ? (
        <div className="header-notifications-popover__empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyMessage} />
        </div>
      ) : (
        <div className="header-notifications-popover__list">
          <List
            dataSource={latest}
            split={false}
            renderItem={(item) => (
              <List.Item className="header-notifications-popover__item">
                <div className="header-notifications-popover__item-main">
                  <div className="header-notifications-popover__item-top">
                    <Typography.Text className="header-notifications-popover__item-title" strong>
                      {item.title}
                    </Typography.Text>
                    {!item.isRead && <Tag color="processing">Mới</Tag>}
                  </div>
                  {item.content && (
                    <Typography.Text className="header-notifications-popover__item-content" type="secondary">
                      {item.content}
                    </Typography.Text>
                  )}
                  <Typography.Text className="header-notifications-popover__item-time" type="secondary">
                    {formatDate(item.createdAt)}
                  </Typography.Text>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}

      <div className="header-notifications-popover__footer">
        <Button type="link" onClick={onViewAll}>
          Xem tất cả
        </Button>
      </div>
    </div>
  )
}

export default NotificationsPopover

