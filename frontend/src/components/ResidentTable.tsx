import React from 'react'
import { Table, Tag, Space, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { formatDateVN, formatResidentGender, formatResidentRelationship, normalizeResident, residentKey } from '../utils/resident'
import type { Resident } from '../types/api'

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

const ResidentTable: React.FC<{
  data?: Resident[] | unknown[]
  loading?: boolean
  onView?: (r: Resident) => void
  onEdit?: (r: Resident) => void
  onDelete?: (id: number | string) => void
  onMakeOwner?: (id: number | string) => void
  showActions?: boolean
}> = ({ data, loading, onView, onEdit, onDelete, onMakeOwner, showActions = true }) => {
  const residents: Resident[] = (data || []).map((resident: unknown) => normalizeResident(resident as Resident))

  const baseColumns: ColumnsType<Resident> = [
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

  const actionColumn: ColumnsType<Resident>[number] = {
    title: 'Hành động', key: 'actions', render: (_: unknown, record: Resident) => (
      <Space>
        <Button size="small" onClick={() => onView && onView(record)}>Xem</Button>
        <Button size="small" onClick={() => onEdit && onEdit(record)}>Sửa</Button>
        {onMakeOwner && record.id !== undefined && (
          <Button
            size="small"
            onClick={() => {
              const id = record.id
              if (id === undefined) return
              onMakeOwner(id)
            }}
          >
            Chủ hộ
          </Button>
        )}
        <Button size="small" danger onClick={() => record.id !== undefined && onDelete?.(record.id)}>Xóa</Button>
      </Space>
    )
  }

  const columns = showActions ? [...baseColumns, actionColumn] : baseColumns

  return <Table rowKey={(record) => residentKey(record)} columns={columns} dataSource={residents} loading={loading} pagination={{ pageSize: 6 }} />
}

export default ResidentTable
