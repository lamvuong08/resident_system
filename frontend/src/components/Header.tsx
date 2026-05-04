import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Popover } from 'antd'
import { NotificationOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons'
import '../styles/App.css'
import { clearAuthStorage, getStoredUser } from '../utils/authStorage'
import NotificationsPopover from './resident/NotificationsPopover'
import { markMyNotificationRead, fetchMyNotifications } from '../utils/notificationApi'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const user = getStoredUser()
  const roleValue = (user.role || 'ROLE_USER').replace('ROLE_', '')
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [unreadNotifications, setUnreadNotifications] = React.useState(0)

  React.useEffect(() => {
    if (roleValue === 'USER') {
      fetchMyNotifications()
        .then((rows) => setUnreadNotifications(rows.filter((item) => !item.isRead).length))
        .catch(() => { })
    }
  }, [roleValue])

  const goNotifications = () => {
    navigate(roleValue === 'ADMIN' ? '/admin/thong-bao' : '/user/notifications')
  }

  const goSettings = () => {
    navigate(roleValue === 'ADMIN' ? '/admin/cai-dat' : '/user/settings')
  }

  const handleLogout = () => {
    clearAuthStorage()
    navigate('/login')
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo">TR</div>
        <div className="brand-name">Tcons Resident</div>
      </div>

      <div className="header-right">
        {roleValue === 'USER' ? (
          <Popover
            trigger="click"
            placement="bottomRight"
            open={notificationsOpen}
            onOpenChange={setNotificationsOpen}
            overlayClassName="header-notifications-popover-overlay"
            content={
              <NotificationsPopover
                open={notificationsOpen}
                onUnreadCountChange={setUnreadNotifications}
                onOpenNotification={async (id) => {
                  try {
                    await markMyNotificationRead(id)
                    setUnreadNotifications((prev) => Math.max(0, prev - 1))
                  } catch {
                    // Không chặn chuyển trang nếu API đánh dấu đọc lỗi.
                  }
                  setNotificationsOpen(false)
                  navigate(`/user/notifications/${id}`)
                }}
                onViewAll={() => {
                  setNotificationsOpen(false)
                  navigate('/user/notifications')
                }}
              />
            }
          >
            <button className="icon-btn" title="Thông báo" type="button">
              <Badge count={unreadNotifications} showZero={false} overflowCount={99} size="small">
                <NotificationOutlined style={{ fontSize: 18, color: '#ffffff' }} />
              </Badge>
            </button>
          </Popover>
        ) : (
          <button className="icon-btn" onClick={goNotifications} title="Thông báo" type="button">
            <NotificationOutlined style={{ fontSize: 18, color: '#ffffff' }} />
          </button>
        )}
        <button className="icon-btn" onClick={goSettings} title="Cài đặt">
          <SettingOutlined style={{ fontSize: 18, color: 'inherit' }} />
        </button>

        <button className="icon-btn" onClick={handleLogout} title="Đăng xuất">
          <LogoutOutlined style={{ fontSize: 18, color: 'inherit' }} />
        </button>
      </div>
    </header>
  )
}

export default Header
