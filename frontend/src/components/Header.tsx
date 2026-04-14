import React from 'react'
import { useNavigate } from 'react-router-dom'
import { NotificationOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons'
import '../styles/App.css'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null') || { name: 'Người dùng', role: 'ROLE_USER' }
  const rawRole = (user.role || 'ROLE_USER').replace('ROLE_', '')

  const goNotifications = () => {
    if (rawRole === 'ADMIN') navigate('/admin/thong-bao')
    else navigate('/user/notifications')
  }

  const goSettings = () => {
    if (rawRole === 'ADMIN') navigate('/admin/cai-dat')
    else navigate('/user/account-settings')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
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
