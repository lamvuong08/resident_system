import React from 'react'
import { Table, Button, Space, Switch, Popconfirm, Tag, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined, HomeOutlined, SwapOutlined, LogoutOutlined } from '@ant-design/icons'
import type { AccountItem } from '../utils/account'
import type { ColumnsType } from 'antd/es/table'
import SlidingPaginationFooter from './SlidingPaginationFooter'

interface AccountTableProps {
  data: AccountItem[]
  loading: boolean
  pagination: {
    current: number
    pageSize: number
    total: number
  }
  onPageChange: (page: number) => void
  onEdit: (record: AccountItem) => void
  onDelete: (id: number) => void
  onToggleStatus: (id: number, checked: boolean) => void
  onAssign: (record: AccountItem) => void
  onChangeApartment: (record: AccountItem) => void
  onRemoveApartment: (record: AccountItem) => void
}

const AccountTable: React.FC<AccountTableProps> = ({
  data,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onToggleStatus,
  onAssign,
  onChangeApartment,
  onRemoveApartment,
}) => {

  const columns: ColumnsType<AccountItem> = [
    {
      title: 'Tên người dùng',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 200,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>Chưa có</span>,
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => {
        const color = role === 'ADMIN' ? 'gold' : 'green'
        return <Tag color={color}>{role}</Tag>
      },
    },
    {
      title: 'Căn hộ',
      key: 'apartment',
      width: 200,
      render: (_, record) => (
        record.apartmentCode ? (
          <strong>{record.apartmentCode}</strong>
        ) : (
          <span style={{ color: '#bfbfbf' }}>-</span>
        )
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={record.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}>
            <Switch
              checked={record.status === 'ACTIVE'}
              onChange={(checked) => onToggleStatus(record.id, checked)}
            />
          </Tooltip>
          {record.status !== 'ACTIVE' && <Tag color="red">Đã vô hiệu hóa</Tag>}
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space size="middle">
          {record.role === 'RESIDENT' && (
            record.apartmentCode ? (
              <>
                <Tooltip title="Chuyển căn hộ">
                  <Button
                    type="primary"
                    size="small"
                    icon={<SwapOutlined />}
                    style={{ height: 24, paddingInline: 6 }}
                    onClick={() => onChangeApartment(record)}
                  />
                </Tooltip>
                <Tooltip title="Rời căn hộ">
                  <Button
                    danger
                    size="small"
                    icon={<LogoutOutlined />}
                    style={{ height: 24, paddingInline: 6 }}
                    onClick={() => onRemoveApartment(record)}
                  />
                </Tooltip>
              </>
            ) : (
              <Tooltip title="Gán căn hộ">
                <Button
                  type="primary"
                  size="small"
                  icon={<HomeOutlined />}
                  style={{ height: 24, paddingInline: 6 }}
                  onClick={() => onAssign(record)}
                />
              </Tooltip>
            )
          )}
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ color: '#1890ff' }} />}
            style={{ height: 24, paddingInline: 6 }}
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            title="Xóa tài khoản"
            description="Bạn có chắc chắn muốn xóa tài khoản này?"
            onConfirm={() => onDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              style={{ height: 24, paddingInline: 6 }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        rowClassName={(record) => (record.status === 'ACTIVE' ? '' : 'account-disabled-row')}
        loading={loading}
        pagination={false}
        scroll={{ x: 800 }}
      />
      <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
        <SlidingPaginationFooter
          total={pagination.total}
          currentPage={pagination.current}
          onPageChange={onPageChange}
          totalLabel={`Tổng số tài khoản: ${pagination.total}`}
        />
      </div>
    </div>
  )
}

export default AccountTable
