import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, Button } from 'antd'
import type { AccountItem, AccountUpsertRequest } from '../utils/account'

interface AccountFormModalProps {
  open: boolean
  onCancel: () => void
  onSuccess: () => void
  initialData?: AccountItem | null
  loading?: boolean
  onSubmit: (values: AccountUpsertRequest) => void
}

const AccountFormModal: React.FC<AccountFormModalProps> = ({
  open,
  onCancel,
  initialData,
  loading,
  onSubmit,
}) => {
  const [form] = Form.useForm<AccountUpsertRequest>()

  const isEdit = !!initialData

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          name: initialData.fullName,
          email: initialData.email,
          phone: initialData.phone || '',
          role: initialData.role,
          status: initialData.status,
          password: '',
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          role: 'RESIDENT',
          status: 'ACTIVE',
        })
      }
    }
  }, [open, initialData, form])

  const handleFinish = (values: any) => {
    onSubmit(values)
  }

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item
          name="name"
          label="Họ tên"
          rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
        >
          <Input placeholder="Nhập họ tên" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input placeholder="Nhập email" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[
            { required: false },
            { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ' }
          ]}
        >
          <Input placeholder="Nhập số điện thoại (tùy chọn)" />
        </Form.Item>

        <Form.Item
          name="password"
          label={isEdit ? 'Mật khẩu mới (bỏ trống nếu không đổi)' : 'Mật khẩu'}
          rules={[{ required: !isEdit, message: 'Vui lòng nhập mật khẩu' }]}
        >
          <Input.Password placeholder="Nhập mật khẩu" />
        </Form.Item>

        {!isEdit && (
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="Xác nhận mật khẩu" />
          </Form.Item>
        )}

        <Form.Item
          name="role"
          label="Vai trò"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
        >
          <Select
            placeholder="Chọn vai trò"
            options={[
              { value: 'ADMIN', label: 'Admin' },
              { value: 'RESIDENT', label: 'Cư dân' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
        >
          <Select
            placeholder="Chọn trạng thái"
            options={[
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'DISABLED', label: 'Vô hiệu hóa' },
            ]}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AccountFormModal
