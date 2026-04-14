import React, { useState } from 'react'
import { Menu, Avatar, Button, Tooltip } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  HomeOutlined,
  BranchesOutlined,
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
  HistoryOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

import '../styles/sidebar.css'

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  const user = JSON.parse(localStorage.getItem('user') || 'null') || { name: 'Người dùng', role: 'ROLE_USER' }
  const rawRole = (user.role || 'ROLE_USER').replace('ROLE_', '')
  const displayRole = rawRole === 'ADMIN' ? 'Quản trị viên' : rawRole === 'USER' ? 'Người dùng' : rawRole

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const location = useLocation()

  const getActiveKeyFromPath = (path: string) => {
    if (rawRole === 'ADMIN') {
      if (path === '/admin' || path === '/admin/') return 'dashboard'
      if (path.startsWith('/admin/quan-ly-toa-nha')) return 'quan-ly-toa-nha'
      if (path.startsWith('/admin/quan-ly-can-ho')) return 'quan-ly-can-ho'
      if (path.startsWith('/admin/quan-ly-ho-khau')) return 'quan-ly-ho-khau'
      if (path.startsWith('/admin/quan-ly-cu-dan') || path.startsWith('/admin/quan-ly-dan-cu')) return 'quan-ly-cu-dan'
      if (path.startsWith('/admin/yeu-cau-nguoi-dan')) return 'yeu-cau-nguoi-dan'
      if (path.startsWith('/admin/quan-ly-thanh-toan')) return 'quan-ly-thanh-toan'
      if (path.startsWith('/admin/thong-ke')) return 'thong-ke'
      if (path.startsWith('/admin/quan-ly-tai-khoan')) return 'quan-ly-tai-khoan'
      if (path.startsWith('/admin/thong-bao')) return 'thong-bao'
      if (path.startsWith('/admin/cai-dat')) return 'cai-dat'
    }

    if (rawRole !== 'ADMIN') {
      if (path === '/user' || path === '/user/') return 'home'
      if (path.startsWith('/user/profile')) return 'profile'
      if (path.startsWith('/user/hokhau')) return 'hokhau'
      if (path.startsWith('/user/payment')) return 'payment'
      if (path.startsWith('/user/send-request')) return 'send-request'
      if (path.startsWith('/user/tam-tru')) return 'tam-tru'
      if (path.startsWith('/user/notifications')) return 'notifications'
      if (path.startsWith('/user/history')) return 'history'
      if (path.startsWith('/user/account-settings')) return 'account-settings'
    }

    return ''
  }

  const activeKey = getActiveKeyFromPath(location.pathname)

  const navigateByKey = (key: string) => {
    if (!key) return
    if (rawRole === 'ADMIN') {
      navigate(`/admin${key === 'dashboard' ? '' : '/' + key}`)
    } else {
      const map: Record<string, string> = {
        home: '/user',
        profile: '/user/profile',
        hokhau: '/user/hokhau',
        payment: '/user/payment',
        'send-request': '/user/send-request',
        'tam-tru': '/user/tam-tru',
        notifications: '/user/notifications',
        history: '/user/history',
        'account-settings': '/user/account-settings',
      }
      const to = map[key] || '/user'
      navigate(to)
    }
  }

  const adminItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'quan-ly-toa-nha', icon: <ApartmentOutlined />, label: 'Quản lý tòa nhà' },
    { key: 'quan-ly-can-ho', icon: <HomeOutlined />, label: 'Quản lý căn hộ' },
    { key: 'quan-ly-ho-khau', icon: <BankOutlined />, label: 'Quản lý hộ khẩu' },
    { key: 'quan-ly-cu-dan', icon: <TeamOutlined />, label: 'Quản lý cư dân' },
    { key: 'yeu-cau-nguoi-dan', icon: <FileTextOutlined />, label: 'Yêu cầu cư dân' },
    { key: 'quan-ly-thanh-toan', icon: <CreditCardOutlined />, label: 'Quản lý thanh toán' },
    { key: 'thong-ke', icon: <BarChartOutlined />, label: 'Thống kê' },
    { key: 'thong-bao', icon: <NotificationOutlined />, label: 'Thông báo' },
    { key: 'quan-ly-tai-khoan', icon: <UserOutlined />, label: 'Quản lý tài khoản' },
    { key: 'cai-dat', icon: <SettingOutlined />, label: 'Cài đặt' },
  ]

  const userItems = [
    { key: 'home', icon: <HomeOutlined />, label: 'Trang chủ' },
    { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân' },
    { key: 'hokhau', icon: <HomeOutlined />, label: 'Thông tin hộ khẩu' },
    { key: 'payment', icon: <CreditCardOutlined />, label: 'Thanh toán' },
    { key: 'send-request', icon: <FileTextOutlined />, label: 'Gửi yêu cầu' },
    { key: 'tam-tru', icon: <CalendarOutlined />, label: 'Tạm trú / Tạm vắng' },
    { key: 'notifications', icon: <NotificationOutlined />, label: 'Thông báo' },
    { key: 'history', icon: <HistoryOutlined />, label: 'Lịch sử yêu cầu' },
    { key: 'account-settings', icon: <SettingOutlined />, label: 'Cài đặt tài khoản' },
  ]

  const items = rawRole === 'ADMIN' ? adminItems : userItems

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>

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
          <Avatar size={collapsed ? 36 : 40} style={{ backgroundColor: '#2f6f8f' }} icon={<UserOutlined />} />
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
