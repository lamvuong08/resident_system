import React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Admin from './pages/admin/Admin'
import NotificationManagement from './pages/admin/NotificationManagement';
import ConfirmRegister from './pages/auth/ConfirmRegister'
import Forgot from './pages/auth/Forgot'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Reset from './pages/auth/Reset'
import Home from './pages/user/Home'
import Dashboard from './pages/admin/Dashboard'
import ApartmentManagement from './pages/admin/ApartmentManagement'
import BuildingManagement from './pages/admin/BuildingManagement'
import ResidenceManagement from './pages/admin/ResidenceManagement'
import ResidentManagement from './pages/admin/ResidentManagement'
import AccountManagement from './pages/admin/AccountManagement'
import User from './pages/user/User'
import ResidentSupport from './pages/user/ResidentSupport';
import './styles/App.css'
import { getStoredRole, hasToken } from './utils/authStorage'

type RoleKey = 'ADMIN' | 'USER'

type GuardProps = {
  children: React.ReactElement
}

type RoleGuardProps = GuardProps & {
  role: RoleKey
}

const AUTH_PATHS = ['/', '/login', '/register', '/forgot', '/forgot-password', '/reset', '/confirm-register']

const RequireAuth: React.FC<GuardProps> = ({ children }) => {
  if (!hasToken()) {
    return <Navigate to="/login" replace />
  }
  return children
}

const RequireRole: React.FC<RoleGuardProps> = ({ role, children }) => {
  if (!hasToken()) {
    return <Navigate to="/login" replace />
  }

  const currentRole = getStoredRole()
  if (!currentRole.includes(role)) {
    return <Navigate to={role === 'ADMIN' ? '/user' : '/admin'} replace />
  }

  return children
}

function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

function App() {
  const location = useLocation()
  const showHeader = !AUTH_PATHS.includes(location.pathname)

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/forgot-password" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/confirm-register" element={<ConfirmRegister />} />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/admin/*" element={<RequireRole role="ADMIN"><Admin /></RequireRole>}>
          <Route index element={<Dashboard />} />
          <Route path="quan-ly-cu-tru" element={<ResidenceManagement />} />
          <Route path="quan-ly-cu-dan" element={<ResidentManagement />} />
          <Route path="quan-ly-ho-khau" element={<Navigate to="/admin/quan-ly-cu-tru" replace />} />
          <Route path="quan-ly-dan-cu" element={<Navigate to="/admin/quan-ly-cu-dan" replace />} />
          <Route path="quan-ly-can-ho" element={<ApartmentManagement />} />
          <Route path="quan-ly-toa-nha" element={<BuildingManagement />} />
          <Route path="thong-bao" element={<NotificationManagement />} />
          <Route path="quan-ly-tai-khoan" element={<AccountManagement />} />
        </Route>
        <Route path="/user/*" element={<RequireRole role="USER"><User /></RequireRole>}>
          <Route path="support" element={<ResidentSupport />} />
          <Route index element={<Home />} />
        </Route>
        <Route path="/" element={<Login />} />
      </Routes>
    </>
  )
}

export default AppWrapper
