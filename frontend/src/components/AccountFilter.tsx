import React from 'react'
import { Input, Select, Button, Space, Form } from 'antd'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'

export interface AccountFilterValues {
  search: string
  role: string
  status: string
}

interface AccountFilterProps {
  onFilter: (values: AccountFilterValues) => void
  onClear: () => void
  loading?: boolean
}

const AccountFilter: React.FC<AccountFilterProps> = ({ onFilter, onClear, loading }) => {
  const [form] = Form.useForm<AccountFilterValues>()

  const handleFinish = (values: AccountFilterValues) => {
    onFilter(values)
  }

  const handleClear = () => {
    form.resetFields()
    onClear()
  }

  return (
    <div className="account-filter-panel">
      <Form
        form={form}
        layout="inline"
        onFinish={handleFinish}
        initialValues={{ search: '', role: 'ALL', status: 'ALL' }}
        className="account-filter-form"
      >
        <Form.Item name="search" className="account-search-item" style={{ flex: 1, minWidth: 250, marginBottom: 0 }}>
          <Input
            className="account-control"
            placeholder="Tìm theo tên, email, sđt..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
          />
        </Form.Item>

        <Form.Item name="role" style={{ width: 180, marginBottom: 0 }}>
          <Select
            className="account-control"
            placeholder="Vai trò"
            options={[
              { value: 'ALL', label: 'Tất cả vai trò' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'RESIDENT', label: 'Cư dân' },
            ]}
          />
        </Form.Item>

        <Form.Item name="status" style={{ width: 180, marginBottom: 0 }}>
          <Select
            className="account-control"
            placeholder="Trạng thái"
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'DISABLED', label: 'Vô hiệu hóa' },
            ]}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button className="account-control account-action-btn" type="primary" htmlType="submit" loading={loading} icon={<SearchOutlined />}>
              Tìm kiếm
            </Button>
            <Button className="account-control account-action-btn" onClick={handleClear} icon={<ClearOutlined />}>
              Xóa lọc
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default AccountFilter
