import React, { useEffect, useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Input,
  Button,
  Table,
  Tag,
  InputNumber,
  Typography,
  message,
  Statistic,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ThunderboltOutlined,
  SearchOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LockOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import {
  fetchMeterReadingApartments,
  recordMeterReading,
  fetchBuildings,
} from '../../utils/meterReadingApi'
import type { ApartmentMeterReadingItem, BuildingOption } from '../../utils/meterReadingApi'
import { extractApiError } from '../../utils/api'

const { Title, Text } = Typography

const StaffMeterReading: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | undefined>(undefined)
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())
  const [searchKeyword, setSearchKeyword] = useState<string>('')

  const [apartments, setApartments] = useState<ApartmentMeterReadingItem[]>([])
  // Lưu chỉ số mới đang nhập cho từng căn hộ: apartmentId -> number
  const [inputReadings, setInputReadings] = useState<Record<number, number | undefined>>({})
  const [savingRows, setSavingRows] = useState<Record<number, boolean>>({})

  // Tải danh sách tòa nhà
  useEffect(() => {
    fetchBuildings()
      .then((data) => setBuildings(data))
      .catch((err) => message.error(extractApiError(err, 'Không thể tải danh sách tòa nhà')))
  }, [])

  const billingMonthString = useMemo(() => {
    return selectedMonth ? selectedMonth.format('MM/YYYY') : dayjs().format('MM/YYYY')
  }, [selectedMonth])

  // Tải danh sách căn hộ theo bộ lọc
  const loadApartments = async () => {
    setLoading(true)
    try {
      const data = await fetchMeterReadingApartments({
        buildingId: selectedBuildingId,
        floor: selectedFloor,
        billingMonth: billingMonthString,
      })
      setApartments(data)

      // Khởi tạo giá trị nhập từ dữ liệu đã có
      const initialInputs: Record<number, number | undefined> = {}
      data.forEach((item) => {
        if (item.newReading !== null && item.newReading !== undefined) {
          initialInputs[item.apartmentId] = item.newReading
        }
      })
      setInputReadings(initialInputs)
    } catch (err) {
      message.error(extractApiError(err, 'Lỗi khi tải danh sách căn hộ ghi điện'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApartments()
  }, [selectedBuildingId, selectedFloor, billingMonthString])

  // Lọc theo từ khóa tìm kiếm (mã phòng, tên chủ hộ)
  const filteredApartments = useMemo(() => {
    if (!searchKeyword.trim()) return apartments
    const kw = searchKeyword.trim().toLowerCase()
    return apartments.filter(
      (apt) =>
        apt.apartmentCode.toLowerCase().includes(kw) ||
        (apt.ownerName && apt.ownerName.toLowerCase().includes(kw))
    )
  }, [apartments, searchKeyword])

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = filteredApartments.length
    const recorded = filteredApartments.filter((a) => a.recordedStatus === 'RECORDED').length
    const notRecorded = total - recorded
    const totalKwh = filteredApartments.reduce((sum, a) => sum + (a.usageAmount || 0), 0)
    return { total, recorded, notRecorded, totalKwh }
  }, [filteredApartments])

  // Thay đổi chỉ số mới trong ô nhập
  const handleReadingChange = (apartmentId: number, val: number | null) => {
    setInputReadings((prev) => ({
      ...prev,
      [apartmentId]: val ?? undefined,
    }))
  }

  // Lưu chỉ số điện của một căn hộ
  const handleSaveReading = async (record: ApartmentMeterReadingItem) => {
    const newReading = inputReadings[record.apartmentId]
    if (newReading === undefined || newReading === null) {
      message.warning(`Vui lòng nhập chỉ số điện mới cho căn hộ ${record.apartmentCode}`)
      return
    }

    if (newReading < record.oldReading) {
      message.error(
        `Chỉ số mới (${newReading}) không được nhỏ hơn chỉ số cũ (${record.oldReading})`
      )
      return
    }

    setSavingRows((prev) => ({ ...prev, [record.apartmentId]: true }))
    try {
      await recordMeterReading({
        apartmentId: record.apartmentId,
        meterTypeId: record.meterTypeId,
        billingMonth: billingMonthString,
        newReading: Number(newReading),
      })
      message.success(`Đã ghi nhận chỉ số điện thành công cho căn hộ ${record.apartmentCode}`)
      await loadApartments()
    } catch (err) {
      message.error(extractApiError(err, 'Lỗi khi lưu chỉ số điện'))
    } finally {
      setSavingRows((prev) => ({ ...prev, [record.apartmentId]: false }))
    }
  }

  // Danh sách các tầng của tòa nhà đang chọn
  const floorOptions = useMemo(() => {
    if (!selectedBuildingId) return []
    const b = buildings.find((x) => x.id === selectedBuildingId)
    const maxFloors = b?.totalFloors || 12
    return Array.from({ length: maxFloors }, (_, i) => ({
      value: i + 1,
      label: `Tầng ${i + 1}`,
    }))
  }, [selectedBuildingId, buildings])

  const columns: ColumnsType<ApartmentMeterReadingItem> = [
    {
      title: 'STT',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Căn hộ',
      dataIndex: 'apartmentCode',
      key: 'apartmentCode',
      width: 110,
      render: (code) => <strong>{code}</strong>,
    },
    {
      title: 'Tòa / Tầng',
      key: 'buildingFloor',
      width: 120,
      render: (_, r) => `${r.buildingName || r.buildingCode} - Tầng ${r.floorNumber}`,
    },
    {
      title: 'Chủ hộ',
      dataIndex: 'ownerName',
      key: 'ownerName',
      width: 160,
      render: (owner) =>
        owner && owner !== 'Chưa có chủ hộ' ? (
          <span style={{ fontWeight: 500 }}>{owner}</span>
        ) : (
          <span style={{ color: '#bfbfbf' }}>Chưa có</span>
        ),
    },
    {
      title: 'Chỉ số cũ (kWh)',
      dataIndex: 'oldReading',
      key: 'oldReading',
      width: 130,
      align: 'right',
      render: (val) => (
        <Tag color="default" style={{ fontSize: 13, fontWeight: 'bold' }}>
          {val ?? 0}
        </Tag>
      ),
    },
    {
      title: 'Chỉ số mới (kWh)',
      key: 'newReading',
      width: 170,
      render: (_, record) => {
        const val = inputReadings[record.apartmentId]
        return (
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={1}
            precision={2}
            placeholder="Nhập chỉ số..."
            value={val}
            disabled={record.isLocked}
            onChange={(v) => handleReadingChange(record.apartmentId, v)}
            status={val !== undefined && val < record.oldReading ? 'error' : ''}
          />
        )
      },
    },
    {
      title: 'Tiêu thụ (kWh)',
      key: 'usage',
      width: 130,
      align: 'right',
      render: (_, record) => {
        const currentInput = inputReadings[record.apartmentId]
        if (currentInput === undefined || currentInput === null) {
          if (record.usageAmount !== null) {
            return (
              <Tag color="blue" style={{ fontWeight: 'bold' }}>
                {record.usageAmount} kWh
              </Tag>
            )
          }
          return <span style={{ color: '#bfbfbf' }}>-</span>
        }

        const diff = Number((currentInput - record.oldReading).toFixed(2))
        if (diff < 0) {
          return <Tag color="error">Không hợp lệ</Tag>
        }
        return (
          <Tag color="green" style={{ fontWeight: 'bold' }}>
            {diff} kWh
          </Tag>
        )
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_, record) => {
        if (record.isLocked) {
          return (
            <Tooltip title="Hóa đơn tháng này đã được thanh toán, không thể sửa">
              <Tag color="cyan" icon={<LockOutlined />}>
                Đã thanh toán (Khóa)
              </Tag>
            </Tooltip>
          )
        }
        if (record.recordedStatus === 'RECORDED') {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Đã ghi nhận
            </Tag>
          )
        }
        return (
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            Chưa ghi
          </Tag>
        )
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const isSaving = !!savingRows[record.apartmentId]
        const hasInput = inputReadings[record.apartmentId] !== undefined
        const isInvalid =
          hasInput && Number(inputReadings[record.apartmentId]) < record.oldReading

        return (
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            loading={isSaving}
            disabled={record.isLocked || !hasInput || isInvalid}
            onClick={() => handleSaveReading(record)}
          >
            {record.recordedStatus === 'RECORDED' ? 'Cập nhật' : 'Lưu'}
          </Button>
        )
      },
    },
  ]

  return (
    <div style={{ padding: '0 24px 24px', textAlign: 'left' }}>
      {/* Tiêu đề trang */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          textAlign: 'left',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <Title level={3} style={{ margin: 0, color: '#1f1f1f', textAlign: 'left' }}>
            Ghi nhận chỉ số điện
          </Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'left' }}>
            Nhập và chốt chỉ số công tơ điện định kỳ hàng tháng cho từng căn hộ
          </Text>
        </div>
        <Button className="fix-height-32" icon={<SyncOutlined />} onClick={loadApartments} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Thẻ thống kê */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Statistic
              title="Tổng số căn hộ"
              value={stats.total}
              prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Statistic
              title="Đã ghi chỉ số"
              value={stats.recorded}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Statistic
              title="Chưa ghi chỉ số"
              value={stats.notRecorded}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              styles={{ content: { color: '#fa8c16', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Statistic
              title="Tổng điện tiêu thụ"
              value={stats.totalKwh}
              suffix="kWh"
              styles={{ content: { color: '#722ed1', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Thanh bộ lọc */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Kỳ ghi điện (Tháng/Năm):
            </Text>
            <DatePicker
              className="fix-height-32"
              picker="month"
              format="MM/YYYY"
              allowClear={false}
              style={{ width: '100%' }}
              value={selectedMonth}
              onChange={(d) => d && setSelectedMonth(d)}
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Chọn Tòa nhà:
            </Text>
            <Select
              className="fix-height-32"
              allowClear
              placeholder="Tất cả tòa nhà"
              style={{ width: '100%' }}
              value={selectedBuildingId}
              onChange={(val) => {
                setSelectedBuildingId(val)
                setSelectedFloor(undefined)
              }}
              options={buildings.map((b) => ({
                value: b.id,
                label: b.name,
              }))}
            />
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Chọn Tầng:
            </Text>
            <Select
              className="fix-height-32"
              allowClear
              placeholder="Tất cả tầng"
              style={{ width: '100%' }}
              value={selectedFloor}
              disabled={!selectedBuildingId}
              onChange={(val) => setSelectedFloor(val)}
              options={floorOptions}
            />
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Tìm kiếm:
            </Text>
            <Input
              className="fix-height-32"
              placeholder="Nhập mã căn hộ hoặc tên chủ hộ..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>
        </Row>
      </Card>

      {/* Bảng danh sách căn hộ */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Table
          rowKey="apartmentId"
          columns={columns}
          dataSource={filteredApartments}
          loading={loading}
          pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t) => `Tổng cộng ${t} căn hộ` }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}

export default StaffMeterReading
