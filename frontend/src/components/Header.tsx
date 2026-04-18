import React from 'react'
import { useNavigate } from 'react-router-dom'
import { NotificationOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons'
import '../styles/App.css'
import { clearAuthStorage, getStoredUser } from '../utils/authStorage'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const user = getStoredUser()
  const roleValue = (user.role || 'ROLE_USER').replace('ROLE_', '')

  const goNotifications = () => {
    navigate(roleValue === 'ADMIN' ? '/admin/thong-bao' : '/user/notifications')
  }

  const goSettings = () => {
    navigate(roleValue === 'ADMIN' ? '/admin/cai-dat' : '/user/account-settings')
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
        <button className="icon-btn" onClick={goNotifications} title="Thông báo">
          <NotificationOutlined style={{ fontSize: 18, color: 'inherit' }} />
        </button>
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
