import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Button, Typography, Space, Tooltip, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  FileTextOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { fetchAdminRequests, getAdminRequestTypeLabel } from '../../utils/adminSupportApi'
import type { AdminRequestRow } from '../../utils/adminSupportApi'
import { fetchMeterReadingApartments } from '../../utils/meterReadingApi'
import { formatUserRequestDate } from '../../utils/userSupportApi'
import { extractApiError } from '../../utils/api'
import { useNotification } from '../../context/NotificationContext'

const { Title, Text } = Typography

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { requestUpdatesVersion } = useNotification()
  const [loading, setLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<AdminRequestRow[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [totalInProgress, setTotalInProgress] = useState(0)
  const [unrecordedMeters, setUnrecordedMeters] = useState(0)
  const [totalApartments, setTotalApartments] = useState(0)
  const requestRef = useRef(0)

  const currentMonthString = dayjs().format('MM/YYYY')

  const loadDashboardData = useCallback(async () => {
    const revision = ++requestRef.current
    setLoading(true)
    try {
      const [pendingRes, inProgressRes, meters] = await Promise.all([
        fetchAdminRequests({ page: 1, size: 5, status: 'PENDING' }),
        fetchAdminRequests({ page: 1, size: 1, status: 'MINE' }),
        fetchMeterReadingApartments({ billingMonth: currentMonthString }),
      ])
      if (revision !== requestRef.current) return
      setPendingRequests(pendingRes.items || [])
      setTotalPending(pendingRes.totalElements || 0)
      setTotalInProgress(inProgressRes.totalElements || 0)
      setTotalApartments(meters.length)
      const notRecorded = meters.filter((m) => m.recordedStatus !== 'RECORDED').length
      setUnrecordedMeters(notRecorded)
    } catch (err) {
      if (revision === requestRef.current) message.error(extractApiError(err, 'Lỗi khi tải dữ liệu tổng quan công việc'))
    } finally {
      if (revision === requestRef.current) setLoading(false)
    }
  }, [currentMonthString])

  useEffect(() => {
    loadDashboardData()
    return () => { ++requestRef.current }
  }, [loadDashboardData, requestUpdatesVersion])

  // Điều hướng trực tiếp đến đúng thao tác xử lý của yêu cầu được chọn
  const handleProcessImmediately = (record: AdminRequestRow) => {
    navigate(`/staff/requests?requestId=${record.id}`, {
      state: { requestId: record.id, requestRow: record },
    })
  }

  const columns: ColumnsType<AdminRequestRow> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'id',
      key: 'id',
      width: 85,
      align: 'center',
      render: (id: number) => <Text strong style={{ color: '#1677ff' }}>#{id}</Text>,
    },
    {
      title: 'Loại yêu cầu',
      dataIndex: 'type',
      key: 'type',
      width: 125,
      render: (type: string) => <Tag color="blue" style={{ borderRadius: 4 }}>{getAdminRequestTypeLabel(type)}</Tag>,
    },
    {
      title: 'Căn hộ / Cư dân',
      key: 'resident',
      width: '28%',
      render: (_: unknown, record: AdminRequestRow) => {
        const apt = record.resident?.apartment
        const name = record.resident?.name
        return (
          <div style={{ lineHeight: 1.45 }}>
            <div style={{ fontWeight: 600, color: '#1f1f1f', fontSize: 13 }}>
              {apt ? (apt.toLowerCase().includes('phòng') || apt.toLowerCase().includes('căn') ? apt : `Căn hộ ${apt}`) : 'Chưa gắn căn hộ'}
            </div>
            <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>
              {name || 'Chưa rõ tên cư dân'}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Nội dung yêu cầu',
      key: 'content',
      width: '28%',
      render: (_: unknown, record: AdminRequestRow) => {
        const text = record.content || record.title || ''
        return (
          <Tooltip title={text} placement="topLeft" mouseEnterDelay={0.15}>
            <Text
              ellipsis
              style={{
                display: 'block',
                maxWidth: '100%',
                color: '#262626',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {text}
            </Text>
          </Tooltip>
        )
      },
    },
    {
      title: 'Thời gian gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '18%',
      render: (val: string) => (
        <Space size={6} style={{ color: '#595959', fontSize: 13, whiteSpace: 'nowrap' }}>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <span>{formatUserRequestDate(val)}</span>
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      align: 'center',
      render: (_: unknown, record: AdminRequestRow) => (
        <Button
          type="link"
          size="small"
          icon={<ArrowRightOutlined />}
          style={{ fontWeight: 500, padding: 0 }}
          onClick={() => handleProcessImmediately(record)}
        >
          Xử lý ngay
        </Button>
      ),
    },
  ]

  return (
    <div className="workspace-page">
      {/* Header */}
      <div className="workspace-heading">
        <div style={{ textAlign: 'left' }}>
          <Title level={3} style={{ textAlign: 'left' }}>
            Bàn làm việc Nhân viên
          </Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'left' }}>
            Tổng quan các công việc cần xử lý hôm nay: Tiếp nhận phản ánh & Ghi chỉ số điện, nước
          </Text>
        </div>
        <Button className="fix-height-32" icon={<SyncOutlined />} onClick={loadDashboardData} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Thẻ thống kê */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/staff/requests')}
          >
            <Statistic
              title="Yêu cầu chờ tiếp nhận"
              value={totalPending}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/staff/requests')}
          >
            <Statistic
              title="Công việc chưa hoàn thành"
              value={totalInProgress}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/staff/meter-readings')}
          >
            <Statistic
              title={`Chưa ghi điện (T${currentMonthString})`}
              value={unrecordedMeters}
              prefix={<ThunderboltOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: '#ff4d4f', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
          >
            <Statistic
              title="Tổng số căn hộ chung cư"
              value={totalApartments}
              styles={{ content: { color: '#52c41a', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Hành động nhanh */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
              Lối tắt tác vụ chính
            </div>
            <Text type="secondary">Truy cập nhanh vào nghiệp vụ được phân công</Text>
          </div>
          <Space>
            <Button
              type="primary"
              className="fix-height-32"
              icon={<ThunderboltOutlined />}
              onClick={() => navigate('/staff/meter-readings')}
            >
              Ghi chỉ số điện
            </Button>
            <Button
              className="fix-height-32"
              icon={<FileTextOutlined />}
              onClick={() => navigate('/staff/requests')}
            >
              Quản lý yêu cầu cư dân
            </Button>
          </Space>
        </div>
      </Card>

      {/* Danh sách yêu cầu chờ xử lý */}
      <Card
        variant="borderless"
        title="Danh sách phản ánh / yêu cầu cư dân mới cần tiếp nhận"
        extra={
          <Button type="link" onClick={() => navigate('/staff/requests')}>
            Xem tất cả
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={pendingRequests}
          loading={loading}
          pagination={false}
          scroll={{ x: 850 }}
        />
      </Card>
    </div>
  )
}

export default StaffDashboard
