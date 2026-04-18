import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { notification } from 'antd'
import api, { extractApiError } from '../../utils/api'

export default function ConfirmRegister() {
  const [otp, setOtp] = useState('')
  const loc = useLocation()
  const navigate = useNavigate()
  const state = (loc.state || {}) as { name?: string; email?: string; password?: string }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const payload = { name: state.name, email: state.email, password: state.password, otp }
      await api.post('/auth/confirm-register', payload)
      notification.success({ title: 'Đăng ký thành công', description: 'Bạn có thể đăng nhập ngay bây giờ' })
      setTimeout(() => navigate('/login'), 800)
    } catch (err: any) {
      const m = extractApiError(err, 'Có lỗi xảy ra')
      notification.error({ title: 'Xác thực thất bại', description: m })
    }
  }

  const handleResendOtp = async (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    try {
      await api.post('/auth/send-register-otp', { email: state.email, name: state.name, purpose: 'REGISTER' })
      notification.success({ title: 'Mã OTP đã được gửi lại', description: `Đã gửi tới ${state.email}` })
    } catch (err: any) {
      const m = extractApiError(err, 'Có lỗi xảy ra')
      notification.error({ title: 'Gửi lại OTP thất bại', description: m })
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Đăng Ký</h2>
        <div className="stepper">
          <div className="step"><div className="dot">1</div><div>Thông tin</div></div>
          <div className="step active"><div className="dot">2</div><div>Xác thực OTP</div></div>
        </div>
        <div className="muted small">Mã đã gửi tới: {state.email}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Nhập mã OTP</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </div>
          <div className="form-row btn-group">
            <button className="btn secondary" onClick={handleResendOtp} type="button">Gửi lại OTP</button>
            <button className="btn">Xác thực & Đăng ký</button>
          </div>
        </form>
      </div>
    </div>
  )
}
