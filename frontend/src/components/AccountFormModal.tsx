import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, Button } from 'antd'
import type { AccountItem, AccountUpsertRequest } from '../utils/account'

const { Option } = Select

interface AccountFormModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  initialData?: AccountItem | null
  loading?: boolean
  onSubmit: (values: AccountUpsertRequest) => void
}

const AccountFormModal: React.FC<AccountFormModalProps> = ({
  visible,
  onCancel,
  initialData,
  loading,
  onSubmit,
}) => {
  const [form] = Form.useForm<AccountUpsertRequest>()

  const isEdit = !!initialData

  useEffect(() => {
    if (visible) {
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
  }, [visible, initialData, form])

  const handleFinish = (values: any) => {
    onSubmit(values)
  }

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
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
          <Select placeholder="Chọn vai trò">
            <Option value="ADMIN">Admin</Option>
            <Option value="RESIDENT">Cư dân</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
        >
          <Select placeholder="Chọn trạng thái">
            <Option value="ACTIVE">Hoạt động</Option>
            <Option value="DISABLED">Vô hiệu hóa</Option>
          </Select>
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
