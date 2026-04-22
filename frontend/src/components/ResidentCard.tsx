import React from 'react'
import { Card, Avatar, Button, Tag, Descriptions } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { normalizeResident } from '../utils/resident'
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
    default:
      return 'default'
  }
}

export const ResidentCard: React.FC<{ resident?: Resident | unknown; onEdit?: (r: Resident) => void; onDelete?: (id: number | string) => void }> = ({ resident, onEdit, onDelete }) => {
  const data = normalizeResident((resident as unknown) || {})

  return (
    <Card hoverable style={{ borderRadius: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar size={64} icon={<UserOutlined />} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{data.name}</div>
          <div style={{ marginTop: 8 }}>
            <Descriptions size="small" column={2} colon={false}>
              <Descriptions.Item label="Giới tính">{data.genderLabel}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{data.dobLabel}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{data.cccd}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{data.phone}</Descriptions.Item>
            </Descriptions>
          </div>
          <div style={{ marginTop: 6 }}>
            <Tag color={roleColor(data.relationship || '')}>{data.relationshipLabel}</Tag>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button size="small" onClick={() => onEdit?.(data as Resident)}>Sửa</Button>
          <Button size="small" danger onClick={() => data.id !== undefined && onDelete?.(data.id)}>Xóa</Button>
        </div>
      </div>
    </Card>
  )
}

export default ResidentCard
