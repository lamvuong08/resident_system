import React from 'react'
import { Card, Empty, Table, Tag, Space, Button, Typography } from 'antd'

const { Title, Text } = Typography

type FinanceRow = {
  id: string
  month: string
  total: number
  status: 'PAID' | 'UNPAID' | 'PENDING' | 'OVERDUE'
}

const statusColor: Record<FinanceRow['status'], string> = {
  PAID: 'green',
  UNPAID: 'default',
  PENDING: 'gold',
  OVERDUE: 'red',
}

const statusLabel: Record<FinanceRow['status'], string> = {
  PAID: 'Đã thanh toán',
  UNPAID: 'Chưa thanh toán',
  PENDING: 'Đang cập nhật',
  OVERDUE: 'Quá hạn',
}

const columns = [
  {
    title: 'Tháng thanh toán',
    dataIndex: 'month',
    key: 'month',
  },
  {
    title: 'Tổng phí',
    dataIndex: 'total',
    key: 'total',
    align: 'right' as const,
    render: (value: number) => value.toLocaleString('vi-VN') + ' ₫',
  },
  {
    title: 'Trạng thái thanh toán',
    dataIndex: 'status',
    key: 'status',
    render: (value: FinanceRow['status']) => <Tag color={statusColor[value]}>{statusLabel[value]}</Tag>,
  },
  {
    title: 'Thao tác',
    key: 'actions',
    render: () => (
      <Space>
        <Button size="small">Xem chi tiết</Button>
        <Button size="small" type="primary" ghost>
          Thanh toán
        </Button>
      </Space>
    ),
  },
]

const FinancePanel: React.FC<{ rows?: FinanceRow[] }> = ({ rows }) => {
  const data = rows || []

  return (
    <Card style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>Tài chính / Phí / Thanh toán</Title>
          <Text type="secondary">Giao diện chuẩn, sẽ nối dữ liệu thật ở bước tiếp theo.</Text>
        </div>
        <Tag color="blue">Đang cập nhật</Tag>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        pagination={false}
        locale={{ emptyText: <Empty description="Chưa có dữ liệu tài chính" /> }}
      />
    </Card>
  )
}

export default FinancePanel