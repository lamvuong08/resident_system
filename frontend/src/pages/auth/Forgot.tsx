import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MailOutlined } from '@ant-design/icons'
import '../../styles/forgot.css'
import api from '../../utils/api'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()

  async function submit(e: any) {
    e.preventDefault()
    setMsg('')
    try {
      await api.post('/auth/forgot', { email })
      navigate('/reset', { state: { email } })
    } catch (err: any) {
      const m = err.response?.data || err.message
      setMsg(m)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="auth-brand">TCONS RESIDENT</div>
        <div className="forgot-subtitle">Làm theo các bước để đặt lại mật khẩu</div>

        <div className="stepper" style={{marginTop:8}}>
          <div className="step active"><div className="dot">1</div><div className="label">Xác thực tài khoản</div></div>
          <div className="stepper-line" />
          <div className="step"><div className="dot">2</div><div className="label">Xác thực OTP</div></div>
          <div className="stepper-line" />
          <div className="step"><div className="dot">3</div><div className="label">Đặt mật khẩu mới</div></div>
        </div>

        <form onSubmit={submit} className="register-form" style={{marginTop:6}}>
          <div className="form-row">
            <label><span className="required">*</span> Email</label>
            <div className="input-group">
              <MailOutlined className="input-icon" />
              <input placeholder="Nhập email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <button className="btn">Tiếp tục</button>
          </div>
        </form>

        <div className="register-footer" style={{marginTop:10}}>
          Nhớ mật khẩu?
          <a className="link" onClick={() => navigate('/login')}> Đăng nhập</a>
        </div>

        <div className="message muted">{msg}</div>
      </div>
    </div>
  )
}
