import React, { useState } from 'react'
import { Menu, Avatar, Button, Tooltip } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  HomeOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  NotificationOutlined,
  BankOutlined,
  ApartmentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  CalendarOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { clearAuthStorage, getStoredUser } from '../utils/authStorage'
import { displayInitials } from '../utils/displayInitials'

import '../styles/sidebar.css'

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const user = getStoredUser()
  const rawRole = (user.role || 'ROLE_USER').replace('ROLE_', '')
  const displayRole = rawRole === 'ADMIN' ? 'Quản trị viên' : rawRole === 'USER' ? 'Người dùng' : rawRole

  const handleLogout = () => {
    clearAuthStorage()
    navigate('/login')
  }

  const getActiveKeyFromPath = (path: string) => {
    if (rawRole === 'ADMIN') {
      if (path === '/admin' || path === '/admin/') return 'dashboard'
      if (path.startsWith('/admin/quan-ly-toa-nha')) return 'quan-ly-toa-nha'
      if (path.startsWith('/admin/quan-ly-can-ho')) return 'quan-ly-can-ho'
      if (path.startsWith('/admin/quan-ly-cu-tru') || path.startsWith('/admin/quan-ly-ho-khau')) return 'quan-ly-cu-tru'
      if (path.startsWith('/admin/quan-ly-cu-dan') || path.startsWith('/admin/quan-ly-dan-cu')) return 'quan-ly-cu-dan'
      if (path.startsWith('/admin/requests')) return 'requests'
      if (path.startsWith('/admin/quan-ly-thanh-toan')) return 'quan-ly-thanh-toan'
      if (path.startsWith('/admin/thong-ke')) return 'thong-ke'
      if (path.startsWith('/admin/quan-ly-tai-khoan')) return 'quan-ly-tai-khoan'
      if (path.startsWith('/admin/thong-bao')) return 'thong-bao'
      if (path.startsWith('/admin/cai-dat')) return 'cai-dat'
    }

    if (rawRole !== 'ADMIN') {
      if (path === '/user' || path === '/user/') return 'dashboard'
      if (path.startsWith('/user/profile-household')) return 'profile-household'
      if (path.startsWith('/user/payment')) return 'payment'
      if (path.startsWith('/user/requests')) return 'requests'
      if (path.startsWith('/user/notifications')) return 'notifications'
      if (path.startsWith('/user/temporary')) return 'temporary'
      if (path.startsWith('/user/settings')) return 'settings'
    }

    return ''
  }

  const activeKey = getActiveKeyFromPath(location.pathname)

  const userRouteMap: Record<string, string> = {
    dashboard: '/user',
    'profile-household': '/user/profile-household',
    payment: '/user/payment',
    requests: '/user/requests',
    notifications: '/user/notifications',
    temporary: '/user/temporary',
    settings: '/user/settings',
  }

  const navigateByKey = (key: string) => {
    if (!key) return
    if (rawRole === 'ADMIN') {
      navigate(`/admin${key === 'dashboard' ? '' : '/' + key}`)
      return
    }

    const nextPath = userRouteMap[key] || '/user'
    navigate(nextPath)
  }

  const adminItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'quan-ly-toa-nha', icon: <ApartmentOutlined />, label: 'Quản lý tòa nhà' },
    { key: 'quan-ly-can-ho', icon: <HomeOutlined />, label: 'Quản lý căn hộ' },
    { key: 'quan-ly-cu-tru', icon: <BankOutlined />, label: 'Quản lý cư trú' },
    { key: 'quan-ly-cu-dan', icon: <TeamOutlined />, label: 'Quản lý cư dân' },
    { key: 'requests', icon: <FileTextOutlined />, label: 'Yêu cầu cư dân' },
    { key: 'quan-ly-thanh-toan', icon: <CreditCardOutlined />, label: 'Quản lý thanh toán' },
    { key: 'thong-ke', icon: <BarChartOutlined />, label: 'Thống kê' },
    { key: 'thong-bao', icon: <NotificationOutlined />, label: 'Thông báo' },
    { key: 'quan-ly-tai-khoan', icon: <UserOutlined />, label: 'Quản lý tài khoản' },
    { key: 'cai-dat', icon: <SettingOutlined />, label: 'Cài đặt' },
  ]

  const userItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Trang chủ' },
    { key: 'profile-household', icon: <ApartmentOutlined />, label: 'Hồ sơ & Hộ khẩu' },
    { key: 'payment', icon: <CreditCardOutlined />, label: 'Thanh toán' },
    { key: 'requests', icon: <FileTextOutlined />, label: 'Yêu cầu & Hỗ trợ' },
    { key: 'notifications', icon: <BellOutlined />, label: 'Thông báo' },
    { key: 'temporary', icon: <CalendarOutlined />, label: 'Tạm trú / Tạm vắng' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt' },
  ]

  const items = rawRole === 'ADMIN' ? adminItems : userItems
  const sidebarClassName = `app-sidebar ${collapsed ? 'collapsed' : ''} ${rawRole === 'ADMIN' ? 'admin-sidebar' : 'resident-sidebar'}`

  return (
    <aside className={sidebarClassName}>
      <nav className="sidebar-menu">
        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={activeKey ? [activeKey] : []}
          onClick={(e) => navigateByKey(String(e.key))}
          className="sidebar-ant-menu"
          items={items.map((it) => ({ key: it.key, icon: it.icon, label: it.label }))}
        />
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <Avatar
            size={collapsed ? 36 : 40}
            style={{ backgroundColor: 'var(--resident-user-avatar-bg, #185FA5)' }}
            icon={rawRole === 'ADMIN' ? <UserOutlined /> : undefined}
          >
            {rawRole !== 'ADMIN' ? displayInitials(user.name) : null}
          </Avatar>
          {!collapsed && (
            <div className="user-meta">
              <div className="user-name">{user.name || 'Người dùng'}</div>
              <div className="user-role">{displayRole}</div>
            </div>
          )}
        </div>

        <div className="footer-actions">
          <Tooltip title="Thu gọn sidebar">
            <Button
              type="text"
              className="collapse-btn-bottom"
              onClick={() => setCollapsed((s) => !s)}
              icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: 18 }} /> : <MenuFoldOutlined style={{ fontSize: 18 }} />}
            />
          </Tooltip>

          <div className="logout-wrap">
            <Tooltip title="Đăng xuất">
              <Button
                type="text"
                className="logout-btn"
                onClick={handleLogout}
                icon={<LogoutOutlined style={{ fontSize: 18 }} />}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
