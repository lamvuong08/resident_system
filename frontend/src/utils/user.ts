import api from './api'
import type { StoredUser } from './authStorage'

export type UserProfile = StoredUser & {
  phone?: string
  status?: string
}

export type UpdateProfilePayload = {
  name: string
  phone: string
}

export type SendEmailOtpPayload = {
  newEmail: string
}

export type VerifyEmailOtpPayload = {
  newEmail: string
  otp: string
}

export type UpdateEmailPayload = {
  newEmail: string
  otp: string
}

export type UpdateEmailResponse = {
  message: string
  email: string
  token: string
}

export type ChangePasswordPayload = {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export const userApi = {
  getMe: () => api.get<UserProfile>('/users/me'),
  updateMe: (data: UpdateProfilePayload) => api.put<UserProfile>('/users/me', data),
  sendEmailOtp: (data: SendEmailOtpPayload) => api.post<{ message: string; expiresInSeconds: number; cooldownSeconds: number }>(
    '/users/email/send-otp',
    data
  ),
  verifyEmailOtp: (data: VerifyEmailOtpPayload) => api.post<{ message: string }>('/users/email/verify-otp', data),
  updateEmail: (data: UpdateEmailPayload) => api.put<UpdateEmailResponse>('/users/email', data),
  changePassword: (data: ChangePasswordPayload) => api.post<{ message: string }>('/users/change-password', data),
}
