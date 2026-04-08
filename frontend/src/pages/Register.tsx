import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { notification } from 'antd'
import '../styles/register.css'
import api from '../utils/api'

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()

  async function sendOtp(e: any) {
    e.preventDefault()
    try {
      const fullName = `${lastName} ${firstName}`.trim()
      await api.post('/auth/send-register-otp', { email, name: fullName, purpose: 'REGISTER' })
      notification.success({ message: 'OTP đã gửi', description: 'Vui lòng kiểm tra email để nhận mã OTP' })
      navigate('/confirm-register', { state: { name: fullName, email, password } })
    } catch (err: any) {
      const m = err.response?.data || err.message || 'Có lỗi xảy ra'
      notification.error({ message: 'Đăng ký thất bại', description: m })
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="auth-brand">TCONS RESIDENT</div>
        <div className="auth-subtitle">Đăng ký tài khoản mới</div>
        {/* Stepper */}
        <div className="stepper">
          <div className="step active">
            <div className="step-number">1</div>
            <div className="step-label">Thông tin cá nhân</div>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-number inactive">2</div>
            <div className="step-label">Xác thực OTP</div>
          </div>
        </div>

        <form onSubmit={sendOtp} className="register-form">
          {/* Row 1: Họ và Tên */}
          <div className="form-row two-cols">
            <div className="form-group">
              <label className="form-label">
                <span className="required">*</span>Họ
              </label>
              <div className="input-wrapper">
                <UserOutlined className="input-icon" />
                <input 
                  type="text" 
                  placeholder="Nhập họ của bạn" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                <span className="required">*</span>Tên
              </label>
              <div className="input-wrapper">
                <UserOutlined className="input-icon" />
                <input 
                  type="text" 
                  placeholder="Nhập tên của bạn" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* Row 2: Email và Số điện thoại */}
          <div className="form-row two-cols">
            <div className="form-group">
              <label className="form-label">
                <span className="required">*</span>Email
              </label>
              <div className="input-wrapper">
                <MailOutlined className="input-icon" />
                <input 
                  type="email" 
                  placeholder="Nhập email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                <span className="required">*</span>Số điện thoại
              </label>
              <div className="input-wrapper">
                <PhoneOutlined className="input-icon" />
                <input 
                  type="tel" 
                  placeholder="Nhập số điện thoại" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* Row 3: Mật khẩu và Xác nhận mật khẩu */}
          <div className="form-row two-cols">
            <div className="form-group">
              <label className="form-label">
                <span className="required">*</span>Mật khẩu
              </label>
              <div className="input-wrapper">
                <LockOutlined className="input-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Nhập mật khẩu" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  className="toggle-password" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                <span className="required">*</span>Xác nhận mật khẩu
              </label>
              <div className="input-wrapper">
                <LockOutlined className="input-icon" />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  placeholder="Nhập lại mật khẩu" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  className="toggle-password" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn">
            Tiếp tục
          </button>
        </form>

        {/* Error Message (moved to notifications) */}
        {/* Footer */}
        <div className="form-footer">
          <span className="footer-text">Đã có tài khoản? </span>
          <button type="button" className="login-link" onClick={() => navigate('/login')}>
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  )
}