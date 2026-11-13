import React, { useEffect, useState, useMemo, useRef } from 'react'
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
  Tabs,
  Alert,
  Modal,
  Descriptions,
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
  previewMeterReading,
} from '../../utils/meterReadingApi'
import type { ApartmentMeterReadingItem, BuildingOption, MeterService } from '../../utils/meterReadingApi'
import { extractApiError } from '../../utils/api'
import { readingStatus, readingMoney } from '../../utils/electricityWorkflow'
import '../../styles/staff-meter-reading.css'

const { Title, Text } = Typography

const StaffMeterReading: React.FC = () => {
  const [service, setService] = useState<MeterService>('ELECTRICITY')
  const [detail, setDetail] = useState<ApartmentMeterReadingItem | null>(null)
  const serviceLabel = service === 'WATER' ? 'nước' : 'điện'
  const unit = service === 'WATER' ? 'm³' : 'kWh'
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
  const [estimates, setEstimates] = useState<Record<number, { input: number; amount: number; month: string }>>({})
  const loadSequence = useRef(0)

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
    const sequence = ++loadSequence.current
    setLoading(true)
    try {
      const data = await fetchMeterReadingApartments({
        service,
        buildingId: selectedBuildingId,
        floor: selectedFloor,
        billingMonth: billingMonthString,
      })
      if (sequence !== loadSequence.current) return
      setApartments(data)
      setEstimates({})

      // Khởi tạo giá trị nhập từ dữ liệu đã có
      const initialInputs: Record<number, number | undefined> = {}
      data.forEach((item) => {
        if (item.newReading !== null && item.newReading !== undefined) {
          initialInputs[item.apartmentId] = item.newReading
        }
      })
      setInputReadings(initialInputs)
    } catch (err) {
      if (sequence === loadSequence.current) message.error(extractApiError(err, `Lỗi khi tải danh sách căn hộ ghi ${serviceLabel}`))
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadApartments()
    return () => { loadSequence.current++ }
  }, [selectedBuildingId, selectedFloor, billingMonthString, service])

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
      message.warning(`Vui lòng nhập chỉ số ${serviceLabel} mới cho căn hộ ${record.apartmentCode}`)
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
        service,
        apartmentId: record.apartmentId,
        meterTypeId: record.meterTypeId,
        billingMonth: billingMonthString,
        newReading: Number(newReading),
        expectedVersion: record.version ?? undefined,
      })
      message.success(`Đã gửi chỉ số căn hộ ${record.apartmentCode} chờ ADMIN duyệt`)
      await loadApartments()
    } catch (err) {
      message.error(extractApiError(err, `Lỗi khi lưu chỉ số ${serviceLabel}`))
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
      width: '4%',
      className: 'staff-meter-sequence',
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Căn hộ',
      dataIndex: 'apartmentCode',
      key: 'apartmentCode',
      width: '7%',
      render: (code, record) => <Tooltip title="Xem chi tiết biểu giá">
        <Button type="link" className="staff-meter-apartment-link" aria-label={`Chi tiết căn hộ ${code}`} onClick={() => setDetail(record)}>{code}</Button>
      </Tooltip>,
    },
    {
      title: 'Tòa / Tầng',
      key: 'buildingFloor',
      width: '7%',
      render: (_, record) => <><div>{record.buildingName || record.buildingCode}</div><Text type="secondary">Tầng {record.floorNumber}</Text></>,
    },
    {
      title: 'Chủ hộ',
      dataIndex: 'ownerName',
      width: '10%',
      render: value => value || <Text type="secondary">Chưa có</Text>,
    },
    {
      title: `Chỉ số cũ (${unit})`,
      dataIndex: 'oldReading',
      key: 'oldReading',
      width: '7%',
      align: 'right',
      render: (val) => (
        <Tag color="default" style={{ fontSize: 13, fontWeight: 'bold' }}>
          {val ?? 0}
        </Tag>
      ),
    },
    {
      title: `Chỉ số mới (${unit})`,
      key: 'newReading',
      width: '10%',
      render: (_, record) => {
        const val = inputReadings[record.apartmentId]
        return (
          <InputNumber
            size="small"
            aria-label={`Chỉ số mới căn hộ ${record.apartmentCode}`}
            style={{ width: '100%' }}
            min={0}
            step={1}
            precision={2}
            placeholder="Chỉ số mới"
            value={val}
            disabled={loading || record.isLocked || !!savingRows[record.apartmentId]}
            onChange={(v) => handleReadingChange(record.apartmentId, v)}
            status={val !== undefined && val < record.oldReading ? 'error' : ''}
          />
        )
      },
    },
    {
      title: `Tiêu thụ (${unit})`,
      key: 'usage',
      width: '7%',
      align: 'right',
      render: (_, record) => {
        const currentInput = inputReadings[record.apartmentId]
        if (currentInput === undefined || currentInput === null) {
          if (record.usageAmount !== null) {
            return (
              <Tag color="blue" style={{ fontWeight: 'bold' }}>
                {record.usageAmount} {unit}
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
            {diff} {unit}
          </Tag>
        )
      },
    },
    {
      title: 'Tiền dự kiến',
      key: 'estimate',
      width: '10%',
      align: 'right',
      render: (_, record) => {
        const input = inputReadings[record.apartmentId]
        if (input == null) return '—'
        const cached = estimates[record.apartmentId]
        if (cached?.input === input && cached.month === billingMonthString) return readingMoney(cached.amount)
        if (input === record.newReading) return readingMoney(record.calculatedAmount)
        return <Button type="link" size="small" className="staff-meter-estimate" disabled={input < record.oldReading} onClick={async () => {
          const sequence = loadSequence.current
          try {
            const amount = await previewMeterReading({ service, apartmentId: record.apartmentId, meterTypeId: record.meterTypeId, billingMonth: billingMonthString, newReading: input })
            if (sequence !== loadSequence.current) return
            setEstimates(previous => ({ ...previous, [record.apartmentId]: { input, amount, month: billingMonthString } }))
          } catch (error) { message.error(extractApiError(error, 'Không tính được tiền dự kiến')) }
        }}>Xem dự tính</Button>
      },
    },
    {
      title: 'Kỳ ghi',
      dataIndex: 'billingMonth',
      width: '7%',
    },
    {
      title: 'Người ghi',
      dataIndex: 'recordedBy',
      width: '8%',
      render: value => value || '—',
    },
    {
      title: 'Ngày ghi',
      dataIndex: 'recordedAt',
      width: '9%',
      render: value => value ? <><div>{dayjs(value).format('DD/MM/YYYY')}</div><Text type="secondary">{dayjs(value).format('HH:mm')}</Text></> : '—',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: '9%',
      render: (_, record) => {
        const input = inputReadings[record.apartmentId]
        if (!record.isLocked && input != null && input !== record.newReading) {
          return <Tag color="processing">Chưa lưu</Tag>
        }
        if (record.approvalStatus) {
          const status = readingStatus[record.approvalStatus]
          return <Tooltip title={record.rejectionReason || (record.isLocked ? 'Bản ghi đã duyệt hoặc dữ liệu cũ được khóa; không được sửa trực tiếp' : '')}>
            <div><Tag color={status?.color}>{status?.label}</Tag>{record.rejectionReason && <Text type="danger">{record.rejectionReason}</Text>}</div>
          </Tooltip>
        }
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
      width: '5%',
      align: 'center',
      render: (_, record) => {
        const isSaving = !!savingRows[record.apartmentId]
        const hasInput = inputReadings[record.apartmentId] !== undefined
        const isInvalid =
          hasInput && Number(inputReadings[record.apartmentId]) < record.oldReading

        const actionLabel = record.recordedStatus === 'RECORDED' ? 'Lưu và gửi lại' : 'Lưu và gửi duyệt'
        return (
          <Tooltip title={actionLabel}>
            <span><Button
              type="primary"
              size="small"
              aria-label={`${actionLabel} căn hộ ${record.apartmentCode}`}
              icon={<SaveOutlined />}
              loading={isSaving}
              disabled={loading || record.isLocked || !hasInput || isInvalid}
              onClick={() => handleSaveReading(record)}
            /></span>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <div className="workspace-page">
      {/* Tiêu đề trang */}
      <div className="workspace-heading">
        <div style={{ textAlign: 'left' }}>
          <Title level={3} style={{ textAlign: 'left' }}>
            Ghi nhận chỉ số {serviceLabel}
          </Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'left' }}>
            Nhập chỉ số để gửi ADMIN duyệt. Tiền dự kiến chưa phải khoản cư dân cần thanh toán.
          </Text>
        </div>
        <Button className="fix-height-32" icon={<SyncOutlined />} onClick={loadApartments} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Tabs activeKey={service} onChange={value => {
        loadSequence.current++
        setApartments([]); setInputReadings({}); setEstimates({}); setService(value as MeterService)
      }} items={[
        { key: 'ELECTRICITY', label: 'Chỉ số điện', disabled: Object.values(savingRows).some(Boolean) },
        { key: 'WATER', label: 'Chỉ số nước', disabled: Object.values(savingRows).some(Boolean) },
      ]} />

      <Alert
        type="info"
        showIcon
        title="Nhập chỉ số → Lưu và gửi duyệt → Admin xét duyệt"
        description="Nhập chỉ số mới rồi bấm biểu tượng lưu ở cột Thao tác để gửi admin. Nhập số hoặc Xem dự tính chưa lưu dữ liệu. Bấm mã căn hộ để xem chi tiết biểu giá."
        style={{ marginBottom: 20 }}
      />

      {/* Thẻ thống kê */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
          >
            <Statistic
              title="Tổng số căn hộ"
              value={stats.total}
              prefix={<ThunderboltOutlined style={{ color: 'var(--primary)' }} />}
              styles={{ content: { color: 'var(--primary)', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
          >
            <Statistic
              title="Đã ghi chỉ số"
              value={stats.recorded}
              prefix={<CheckCircleOutlined style={{ color: 'var(--success)' }} />}
              styles={{ content: { color: 'var(--success)', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
          >
            <Statistic
              title="Chưa ghi chỉ số"
              value={stats.notRecorded}
              prefix={<ClockCircleOutlined style={{ color: 'var(--warning)' }} />}
              styles={{ content: { color: 'var(--warning)', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card
            variant="borderless"
            className="stat-card"
          >
            <Statistic
              title={`Tổng ${serviceLabel} tiêu thụ`}
              value={stats.totalKwh}
              suffix={unit}
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
              Kỳ ghi {serviceLabel} (Tháng/Năm):
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
        className="staff-meter-table-card"
      >
        <div className="staff-meter-table">
          <Table
            rowKey="apartmentId"
            columns={columns.map(column => ({
              ...column,
              onCell: () => ({ className: column.className || '', 'data-label': typeof column.title === 'string' ? column.title : '' }),
            }))}
            dataSource={filteredApartments}
            loading={loading}
            pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t) => `Tổng cộng ${t} căn hộ` }}
            size="small"
            tableLayout="fixed"
          />
        </div>
      </Card>
      <Modal title={`Chi tiết ghi chỉ số · ${detail?.apartmentCode || ''}`} open={!!detail} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>Đóng</Button>}>
        {detail && <Descriptions column={1} bordered items={[
          { key: 'period', label: 'Kỳ ghi', children: detail.billingMonth },
          { key: 'staff', label: 'Người ghi', children: detail.recordedBy || 'Chưa ghi' },
          { key: 'time', label: 'Ngày ghi', children: detail.recordedAt ? dayjs(detail.recordedAt).format('DD/MM/YYYY HH:mm') : '—' },
          { key: 'price', label: 'Biểu giá', children: detail.tariffSnapshot || 'Chưa có dữ liệu' },
          { key: 'reason', label: 'Lý do từ chối', children: detail.rejectionReason || '—' },
        ]} />}
      </Modal>
    </div>
  )
}

export default StaffMeterReading
