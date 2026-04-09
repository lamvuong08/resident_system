import React from 'react'
import './styles/App.css'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ConfirmRegister from './pages/ConfirmRegister'
import Home from './pages/Home'
import Forgot from './pages/Forgot'
import Reset from './pages/Reset'
import Admin from './pages/Admin'
import User from './pages/User'

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
  const showHeader = !(
    authPaths.includes(location.pathname) ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/user')
  )

  return (
    <>
      {showHeader && (
        <header className="app-header">
          <div className="brand">Quản lý dân cư</div>
          <div className="nav-links">
            <Link to="/login">Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
          </div>
        </header>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/forgot-password" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/confirm-register" element={<ConfirmRegister />} />
        <Route path="/home" element={<Home />} />
        <Route path="/admin/*" element={<Admin />}>
          <Route index element={<div />} />
          <Route path="quan-ly-dan-cu" element={<React.Suspense fallback=''><div /></React.Suspense>} />
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
