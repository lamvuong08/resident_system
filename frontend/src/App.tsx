import React from 'react'
import './styles/App.css'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ConfirmRegister from './pages/auth/ConfirmRegister'
import Home from './pages/user/Home'
import Forgot from './pages/auth/Forgot'
import Reset from './pages/auth/Reset'
import Admin from './pages/admin/Admin'
import Dashboard from './pages/admin/Dashboard'
import ApartmentManagement from './pages/admin/ApartmentManagement'
import BuildingManagement from './pages/admin/BuildingManagement'
import ResidenceManagement from './pages/admin/ResidenceManagement'
import ResidentManagement from './pages/admin/ResidentManagement'
import AccountManagement from './pages/admin/AccountManagement'
import NotificationManagement from './pages/admin/NotificationManagement'
import RequestManagement from './pages/admin/RequestManagement'
import VehicleManagement from './pages/admin/VehicleManagement'
import User from './pages/user/User'
import ProfileHousehold from './pages/user/ProfileHousehold'
import Payment from './pages/user/Payment'
import SupportPage from './pages/user/support/SupportPage'
import Vehicle from './pages/user/Vehicle'
import Notifications from './pages/user/Notifications'
import TemporaryResidence from './pages/user/TemporaryResidence'
import AdminPaymentManagement from './pages/admin/AdminPaymentManagement'
import Settings from './pages/user/Settings'
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
          <Route path="quan-ly-tai-khoan" element={<AccountManagement />} />
          <Route path="thong-bao" element={<NotificationManagement />} />
          <Route path="requests" element={<RequestManagement />} />
          <Route path="vehicles" element={<VehicleManagement />} />
          <Route path="quan-ly-thanh-toan" element={<AdminPaymentManagement />} />
        </Route>
        <Route path="/user/*" element={<RequireRole role="USER"><User /></RequireRole>}>
          <Route index element={<Home />} />
          <Route path="profile-household" element={<ProfileHousehold />} />
          <Route path="payment" element={<Payment />} />
          <Route path="requests" element={<SupportPage />} />
          <Route path="ho-khau" element={<ProfileHousehold />} />
          <Route path="thanh-toan" element={<Payment />} />
          <Route path="vehicles" element={<Vehicle />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="notifications/:id" element={<Notifications />} />
          <Route path="temporary" element={<TemporaryResidence />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Navigate to="/user/profile-household" replace />} />
          <Route path="hokhau" element={<Navigate to="/user/profile-household" replace />} />
          <Route path="send-request" element={<Navigate to="/user/requests" replace />} />
          <Route path="tam-tru" element={<Navigate to="/user/temporary" replace />} />
          <Route path="account-settings" element={<Navigate to="/user/settings" replace />} />
        </Route>
        <Route path="/" element={<Login />} />
      </Routes>
    </>
  )
}

export default AppWrapper