import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    setEmail('user')
  }, [])

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Trang chính</h2>
        <div className="muted">Xin chào, {email}</div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={logout}>Đăng xuất</button>
        </div>
      </div>
    </div>
  )
}
