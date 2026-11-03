import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Popover } from 'antd'
import { NotificationOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons'
import '../styles/App.css'
import { clearAuthStorage, getStoredRole, getStoredUser } from '../utils/authStorage'
import NotificationsPopover from './resident/NotificationsPopover'
import { useNotification } from '../context/NotificationContext'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const user = getStoredUser()
  const roleString = (user.role || getStoredRole() || 'ROLE_USER').toUpperCase()
  const roleValue = roleString.replace('ROLE_', '')
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)

  const { unreadCount, markAsRead, notifications } = useNotification()

  const goSettings = () => {
    if (roleValue === 'ADMIN') {
      navigate('/admin/cai-dat')
    } else if (roleValue === 'STAFF') {
      navigate('/staff/settings')
    } else {
      navigate('/user/settings')
    }
  }

  const handleLogout = () => {
    clearAuthStorage()
    navigate('/login')
  }

  const handleOpenItem = async (id: number) => {
    try {
      await markAsRead(id)
    } catch {
      // Bỏ qua lỗi mạng khi đánh dấu đọc
    }
    setNotificationsOpen(false)

    const target = notifications.find((n) => n.id === id)
    if (target?.actionUrl) {
      navigate(target.actionUrl)
    } else if (roleValue === 'ADMIN') {
      navigate('/admin/thong-bao')
    } else if (roleValue === 'STAFF') {
      navigate('/staff/requests')
    } else {
      navigate(`/user/notifications/${id}`)
    }
  }

  const handleViewAll = () => {
    setNotificationsOpen(false)
    if (roleValue === 'ADMIN') {
      navigate('/admin/thong-bao')
    } else if (roleValue === 'STAFF') {
      navigate('/staff/requests')
    } else {
      navigate('/user/notifications')
    }
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo">TR</div>
        <div className="brand-name">Tcons Resident</div>
      </div>

      <div className="header-right">
        <Popover
          trigger="click"
          placement="bottomRight"
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          overlayClassName="header-notifications-popover-overlay"
          content={
            <NotificationsPopover
              open={notificationsOpen}
              onOpenNotification={handleOpenItem}
              onViewAll={handleViewAll}
            />
          }
        >
          <button className="icon-btn" title="Thông báo" type="button">
            <Badge count={unreadCount} showZero={false} overflowCount={99} size="small">
              <NotificationOutlined style={{ fontSize: 18, color: '#ffffff' }} />
            </Badge>
          </button>
        </Popover>

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
