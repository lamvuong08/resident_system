import React from 'react'
import { Table, Tag, Space, Button } from 'antd'
import { formatDateVN, formatResidentGender, formatResidentRelationship, normalizeResident, residentKey } from '../utils/resident'

const roleColor = (r: string) => {
  switch (r) {
    case 'HEAD':
    case 'CHU_HO':
      return 'blue'
    case 'SPOUSE':
    case 'VO_CHONG':
      return 'purple'
    case 'CHILD':
    case 'CON':
      return 'orange'
    case 'PARENT':
    case 'CHA_ME':
      return 'gold'
    default:
      return 'default'
  }
}

const ResidentTable: React.FC<any> = ({ data, loading, onView, onEdit, onDelete, showActions = true }) => {
  const residents = (data || []).map((resident: any) => normalizeResident(resident))

  const baseColumns: any[] = [
    { title: 'Họ tên', dataIndex: 'name', key: 'name', render: (value: string) => value || '-' },
    { title: 'Giới tính', dataIndex: 'gender', key: 'gender', render: (value: string) => formatResidentGender(value) },
    { title: 'Ngày sinh', dataIndex: 'dob', key: 'dob', render: (value: string) => formatDateVN(value) },
    { title: 'CCCD', dataIndex: 'cccd', key: 'cccd', render: (value: string) => value || '-' },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone', render: (value: string) => value || '-' },
    {
      title: 'Vai trò trong hộ',
      dataIndex: 'relationship',
      key: 'relationship',
      render: (value: string) => value ? <Tag color={roleColor(value)}>{formatResidentRelationship(value)}</Tag> : <span>-</span>,
    },
  ]

  const actionColumn = {
    title: 'Hành động', key: 'actions', render: (_:any, record:any) => (
      <Space>
        <Button size="small" onClick={() => onView && onView(record)}>Xem</Button>
        <Button size="small" onClick={() => onEdit && onEdit(record)}>Sửa</Button>
        <Button size="small" danger onClick={() => onDelete && onDelete(record.id)}>Xóa</Button>
      </Space>
    )
  }

  const columns = showActions ? [...baseColumns, actionColumn] : baseColumns

  return <Table rowKey={(record) => residentKey(record)} columns={columns} dataSource={residents} loading={loading} pagination={{ pageSize: 6 }} />
}

export default ResidentTable
