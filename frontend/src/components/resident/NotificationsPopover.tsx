import { useMemo, useState } from 'react'
import { Button, Empty, List, Skeleton, Typography } from 'antd'
import { formatNotificationDate } from '../../utils/notificationApi'
import { useNotification } from '../../context/NotificationContext'

type NotificationsPopoverProps = {
  open?: boolean
  onViewAll: () => void
  onOpenNotification: (id: number) => Promise<void> | void
  onUnreadCountChange?: (count: number) => void
}

const NotificationsPopover = ({
  onViewAll,
  onOpenNotification,
}: NotificationsPopoverProps) => {
  const { notifications, loading } = useNotification()
  const [openingId, setOpeningId] = useState<number | null>(null)

  const latest = useMemo(() => notifications.slice(0, 5), [notifications])

  const handleOpenNotification = async (id: number) => {
    setOpeningId(id)
    try {
      await onOpenNotification(id)
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="header-notifications-popover">
      <div className="header-notifications-popover__title">
        <Typography.Text strong>Thông báo</Typography.Text>
      </div>

      {loading && latest.length === 0 ? (
        <div style={{ padding: 12 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : latest.length === 0 ? (
        <div className="header-notifications-popover__empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
        </div>
      ) : (
        <div className="header-notifications-popover__list">
          <List
            dataSource={latest}
            split={false}
            renderItem={(item) => (
              <List.Item
                className={`header-notifications-popover__item ${item.isRead ? 'read' : 'unread'}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void handleOpenNotification(item.id)}
              >
                <div className="header-notifications-popover__item-main" style={{ width: '100%', minWidth: 0 }}>
                  <div className="header-notifications-popover__item-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography.Text className="header-notifications-popover__item-title" strong style={{ flex: 1, paddingRight: 8, wordBreak: 'break-word' }}>
                      {item.title}
                    </Typography.Text>
                    <Typography.Text className="header-notifications-popover__item-time" type="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12, marginTop: 0, flexShrink: 0 }}>
                      {formatNotificationDate(item.createdAt)}
                    </Typography.Text>
                  </div>
                  {item.content && (
                    <Typography.Text className="header-notifications-popover__item-content" type="secondary">
                      {item.content}
                    </Typography.Text>
                  )}
                </div>
                {openingId === item.id && <Skeleton.Button size="small" active />}
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
