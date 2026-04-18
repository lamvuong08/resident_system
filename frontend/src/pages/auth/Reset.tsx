import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EyeInvisibleOutlined, EyeOutlined, KeyOutlined, LockOutlined } from '@ant-design/icons'
import '../../styles/forgot.css'
import api, { extractApiError } from '../../utils/api'

export default function Reset() {
  const loc = useLocation()
  const navigate = useNavigate()
  const state = (loc.state || {}) as { email?: string }
  const [email, setEmail] = useState(state.email || '')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [msg, setMsg] = useState('')
  const [step, setStep] = useState<number>(state.email ? 2 : 1)

  const handleSendOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMsg('')
    try {
      await api.post('/auth/forgot', { email })
      setMsg('Mã OTP đã được gửi tới email')
      setStep(2)
    } catch (err: any) {
      const m = extractApiError(err)
      setMsg(m)
    }
  }

  const handleVerifyOtp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMsg('')
    if (!otp) return setMsg('Vui lòng nhập mã OTP')
    setStep(3)
  }

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMsg('')
    try {
      await api.post('/auth/reset', { email, otp, newPassword })
      setMsg('Đặt lại mật khẩu thành công')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err: any) {
      const m = extractApiError(err)
      setMsg(m)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="register-title">Đặt lại mật khẩu</h2>

        <div className="stepper" style={{marginBottom:8}}>
          <div className={`step ${step===1? 'active':''}`}><div className="dot">1</div><div className="label">Xác thực tài khoản</div></div>
          <div className="stepper-line" />
          <div className={`step ${step===2? 'active':''}`}><div className="dot">2</div><div className="label">Xác thực OTP</div></div>
          <div className="stepper-line" />
          <div className={`step ${step===3? 'active':''}`}><div className="dot">3</div><div className="label">Đặt mật khẩu mới</div></div>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="register-form">
            <div className="form-row">
              <label><span className="required">*</span> Email</label>
              <div className="input-group">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <button className="btn">Tiếp tục</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="register-form">
            <div className="form-row">
              <label><span className="required">*</span> Nhập mã OTP</label>
              <div className="input-group">
                <KeyOutlined className="input-icon" />
                <input value={otp} onChange={(e) => setOtp(e.target.value)} required />
              </div>
            </div>
            <div className="form-row btn-group">
              <button type="button" className="btn secondary" onClick={() => { setStep(1); setMsg('') }}>Quay lại</button>
              <button className="btn" type="submit">Xác thực</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="register-form">
            <div className="form-row">
              <label><span className="required">*</span> Mật khẩu mới</label>
              <div className="input-group">
                <LockOutlined className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <button type="button" className="toggle-btn" onClick={() => setShowPassword(s => !s)} aria-label="Toggle password">
                  {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </button>
              </div>
            </div>
            <div className="form-row">
              <button className="btn">Đặt lại</button>
            </div>
          </form>
        )}

        <div className="message muted">{msg}</div>
      </div>
    </div>
  )
}
