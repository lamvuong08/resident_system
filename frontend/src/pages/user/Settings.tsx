import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Avatar, Button, Card, Input, Tabs, Typography, message } from 'antd'
import { LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { extractApiError } from '../../utils/api'
import { getStoredUser, setAuthSession, setStoredUser } from '../../utils/authStorage'
import type { StoredUser } from '../../utils/authStorage'
import { userApi } from '../../utils/user'
import '../../styles/resident-dashboard.css'

const Settings = () => {
  const [user, setUser] = useState<StoredUser>(() => getStoredUser())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({
    lastName: '',
    firstName: '',
    phone: '',
  })
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    otp: '',
    otpSent: false,
  })
  const [emailSending, setEmailSending] = useState(false)
  const [emailConfirming, setEmailConfirming] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const splitName = (fullName?: string) => {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return { lastName: '', firstName: '' }
    if (parts.length === 1) return { lastName: '', firstName: parts[0] }
    const firstName = parts[parts.length - 1]
    const lastName = parts.slice(0, -1).join(' ')
    return { lastName, firstName }
  }

  const displayName = useMemo(() => {
    const lastName = profileForm.lastName.trim()
    const firstName = profileForm.firstName.trim()
    return [lastName, firstName].filter(Boolean).join(' ').trim()
  }, [profileForm.firstName, profileForm.lastName])

  const syncFormFromUser = (nextUser: StoredUser) => {
    const { lastName, firstName } = splitName(nextUser.name)
    setProfileForm({
      lastName,
      firstName,
      phone: nextUser.phone || '',
    })
    setEmailForm((prev) => ({
      ...prev,
      newEmail: '',
      otp: '',
      otpSent: false,
    }))
  }

  const refreshUser = async (notifyOnError = false) => {
    setLoading(true)
    try {
      const response = await userApi.getMe()
      const payload = response.data || {}
      const nextUser: StoredUser = {
        ...getStoredUser(),
        ...payload,
      }
      setUser(nextUser)
      setStoredUser(nextUser)
      syncFormFromUser(nextUser)
    } catch (err) {
      if (notifyOnError) {
        message.error(extractApiError(err, 'Không thể tải thông tin tài khoản'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    syncFormFromUser(user)
  }, [])

  useEffect(() => {
    void refreshUser(true)
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const handleProfileChange = (field: 'lastName' | 'firstName' | 'phone') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleEmailChange = (field: 'newEmail' | 'otp') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setEmailForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'newEmail'
        ? {
            otp: '',
            otpSent: false,
          }
        : null),
    }))
  }

  const handlePasswordChange =
    (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setPasswordForm((prev) => ({
        ...prev,
        [field]: value,
      }))
    }

  const validateForm = () => {
    const phone = profileForm.phone.trim()

    if (!profileForm.lastName.trim()) {
      message.error('Họ không được để trống')
      return false
    }

    if (!profileForm.firstName.trim()) {
      message.error('Tên không được để trống')
      return false
    }

    if (!/^\+?\d{9,15}$/.test(phone)) {
      message.error('Số điện thoại không hợp lệ')
      return false
    }

    return true
  }

  const handleProfileSave = async () => {
    if (!validateForm()) return

    const fullName = displayName

    setSaving(true)
    try {
      await userApi.updateMe({
        name: fullName,
        phone: profileForm.phone.trim(),
      })
      await refreshUser(true)
      message.success('Cập nhật thông tin thành công')
    } catch (err) {
      message.error(extractApiError(err, 'Không thể cập nhật thông tin'))
    } finally {
      setSaving(false)
    }
  }

  const handleSendOtp = async () => {
    const email = emailForm.newEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.error('Email không hợp lệ')
      return
    }
    if (email === (user.email || '').trim()) {
      message.error('Email mới không được trùng email hiện tại')
      return
    }

    setEmailSending(true)
    try {
      const response = await userApi.sendEmailOtp({ newEmail: email })
      const cooldown = response.data?.cooldownSeconds ?? 60
      setResendCooldown(cooldown)
      setEmailForm((prev) => ({
        ...prev,
        otpSent: true,
        otp: '',
      }))
      message.success(response.data?.message || 'Đã gửi mã xác minh')
    } catch (err) {
      message.error(extractApiError(err, 'Gửi mã xác minh thất bại'))
    } finally {
      setEmailSending(false)
    }
  }

  const handleConfirmEmail = async () => {
    if (!emailForm.otp.trim()) {
      message.error('Vui lòng nhập mã xác minh')
      return
    }

    setEmailConfirming(true)
    try {
      const response = await userApi.updateEmail({
        newEmail: emailForm.newEmail.trim(),
        otp: emailForm.otp.trim(),
      })
      const nextEmail = response.data?.email || emailForm.newEmail.trim()
      const updatedUser: StoredUser = { ...user, email: nextEmail }
      if (response.data?.token) {
        setAuthSession(response.data.token, updatedUser)
      } else {
        setStoredUser(updatedUser)
      }
      setUser(updatedUser)
      setEmailForm({
        newEmail: '',
        otp: '',
        otpSent: false,
      })
      setResendCooldown(0)
      message.success(response.data?.message || 'Cập nhật thành công')
    } catch (err) {
      message.error(extractApiError(err, 'Xác nhận thất bại'))
    } finally {
      setEmailConfirming(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!passwordForm.currentPassword.trim()) {
      message.error('Vui lòng nhập mật khẩu cũ')
      return
    }
    if (passwordForm.newPassword.trim().length < 6) {
      message.error('Mật khẩu mới phải từ 6 ký tự')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      message.error('Xác nhận mật khẩu không khớp')
      return
    }

    setPasswordSaving(true)
    try {
      const response = await userApi.changePassword({
        oldPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      })
      message.success(response.data?.message || 'Đổi mật khẩu thành công')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (err) {
      message.error(extractApiError(err, 'Đổi mật khẩu thất bại'))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="resident-page">
      <div className="resident-settings-header">
        <div>
          <Typography.Title level={3} className="resident-settings-title">
            Cài đặt tài khoản
          </Typography.Title>
        </div>
        <Typography.Text className="resident-settings-subtitle">
          Quản lý thông tin cá nhân và bảo mật tài khoản
        </Typography.Text>
      </div>

      <Card className="resident-dashboard__card resident-settings-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="resident-settings-tabs"
          items={[
            { key: 'profile', label: 'Thông tin cá nhân' },
            { key: 'email', label: 'Cài đặt email' },
            { key: 'password', label: 'Đổi mật khẩu' },
          ]}
        />

        {activeTab === 'profile' && (
          <div className="resident-settings-section">
            <div className="resident-settings-avatar">
              <Avatar size={72} icon={<UserOutlined />}>
                {(user.name || '').charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Typography.Text strong>Ảnh đại diện</Typography.Text>
                <div className="resident-settings-meta">
                  <span>Kích thước: 200x200px</span>
                  <span>Định dạng: JPG, PNG</span>
                  <span>Dung lượng: ≤ 5MB</span>
                </div>
              </div>
            </div>

            <div className="resident-settings-form">
              <div className="resident-settings-grid">
                <div className="resident-settings-field">
                  <label>Họ</label>
                  <Input
                    value={profileForm.lastName}
                    onChange={handleProfileChange('lastName')}
                    placeholder="Nhập họ"
                    prefix={<UserOutlined />}
                  />
                </div>
                <div className="resident-settings-field">
                  <label>Tên</label>
                  <Input
                    value={profileForm.firstName}
                    onChange={handleProfileChange('firstName')}
                    placeholder="Nhập tên"
                    prefix={<UserOutlined />}
                  />
                </div>
              </div>
              <div className="resident-settings-field full">
                <label>Số điện thoại</label>
                <Input
                  value={profileForm.phone}
                  onChange={handleProfileChange('phone')}
                  placeholder="Nhập số điện thoại"
                  prefix={<PhoneOutlined />}
                />
              </div>
            </div>

            <div className="resident-settings-actions">
              <Button type="primary" onClick={handleProfileSave} loading={saving} disabled={loading}>
                Cập nhật thông tin
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="resident-settings-section">
            <div className="resident-settings-form resident-settings-form--aligned">
              <div className="resident-settings-inline-row">
                <label className="resident-settings-inline-label" htmlFor="email-current">
                  Email hiện tại
                </label>
                <div className="resident-settings-inline-field">
                  <Input id="email-current" value={user.email || ''} readOnly prefix={<MailOutlined />} />
                </div>
              </div>
              <div className="resident-settings-inline-row">
                <label className="resident-settings-inline-label" htmlFor="email-new">
                  Email mới
                </label>
                <div className="resident-settings-inline-field">
                  <Input
                    id="email-new"
                    value={emailForm.newEmail}
                    onChange={handleEmailChange('newEmail')}
                    placeholder="Nhập email mới"
                    prefix={<MailOutlined />}
                  />
                </div>
              </div>
              <div className="resident-settings-inline-row">
                <label className="resident-settings-inline-label" htmlFor="email-otp">
                  Mã xác minh
                </label>
                <div className="resident-settings-inline-field">
                  <Input
                    id="email-otp"
                    value={emailForm.otp}
                    onChange={handleEmailChange('otp')}
                    placeholder="Nhập mã OTP"
                    disabled={!emailForm.otpSent}
                  />
                </div>
              </div>
            </div>
            <div className="resident-settings-actions row">
              <Button onClick={handleSendOtp} disabled={emailSending || resendCooldown > 0} loading={emailSending}>
                {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi mã xác minh'}
              </Button>
              <Button
                type="primary"
                onClick={handleConfirmEmail}
                disabled={!emailForm.otpSent || !emailForm.otp.trim()}
                loading={emailConfirming}
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="resident-settings-section">
            <div className="resident-settings-form resident-settings-form--aligned">
              <div className="resident-settings-inline-row">
                <label className="resident-settings-inline-label" htmlFor="password-current">
                  Mật khẩu cũ
                </label>
                <div className="resident-settings-inline-field">
                  <Input.Password
                    id="password-current"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange('currentPassword')}
                    placeholder="Nhập mật khẩu cũ"
                    prefix={<LockOutlined />}
                  />
                </div>
              </div>

              <div className="resident-settings-inline-row">
                <label className="resident-settings-inline-label" htmlFor="password-new">
                  Mật khẩu mới
                </label>
                <div className="resident-settings-inline-field">
                  <Input.Password
                    id="password-new"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange('newPassword')}
                    placeholder="Nhập mật khẩu mới"
                    prefix={<LockOutlined />}
                  />
                </div>
              </div>

              <div className="resident-settings-inline-row">
                <label className="resident-settings-inline-label" htmlFor="password-confirm">
                  Xác nhận mật khẩu mới
                </label>
                <div className="resident-settings-inline-field">
                  <Input.Password
                    id="password-confirm"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange('confirmPassword')}
                    placeholder="Xác nhận mật khẩu"
                    prefix={<LockOutlined />}
                  />
                </div>
              </div>
            </div>

            <div className="resident-settings-actions row">
              <Button type="primary" onClick={handlePasswordSave} loading={passwordSaving} disabled={passwordSaving || loading}>
                Lưu thay đổi
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Settings
