import React from 'react'
import './styles/App.css'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ConfirmRegister from './pages/auth/ConfirmRegister'
import Home from './pages/user/Home'
import Forgot from './pages/auth/Forgot'
import Reset from './pages/auth/Reset'
import Admin from './pages/admin/Admin'
import Dashboard from './pages/admin/Dashboard'
import HouseholdManagement from './pages/admin/HouseholdManagement'
import ApartmentManagement from './pages/admin/ApartmentManagement'
import BuildingManagement from './pages/admin/BuildingManagement'
import User from './pages/user/User'

function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

function App() {
  const location = useLocation()
  const authPaths = ['/', '/login', '/register', '/forgot', '/forgot-password', '/reset', '/confirm-register']
  const showHeader = !authPaths.includes(location.pathname)

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
        <Route path="/home" element={<Home />} />
        <Route path="/admin/*" element={<Admin />}>
          <Route index element={<Dashboard />} />
          <Route path="quan-ly-dan-cu" element={<React.Suspense fallback=''><div /></React.Suspense>} />
          <Route path="quan-ly-ho-khau" element={<HouseholdManagement />} />
          <Route path="quan-ly-can-ho" element={<ApartmentManagement />} />
          <Route path="quan-ly-toa-nha" element={<BuildingManagement />} />
        </Route>
        <Route path="/user/*" element={<User />}>
          <Route index element={<div />} />
        </Route>
        <Route path="/" element={<Login />} />
      </Routes>
    </>
  )
}

export default AppWrapper
