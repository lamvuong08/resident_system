import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckCircleOutlined, CheckOutlined, CloseCircleOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api, { extractApiError } from '../../utils/api'
import SlidingPaginationFooter from '../../components/SlidingPaginationFooter'
import { PAGE_SIZE } from '../../utils/pagination'
import '../../styles/residence-management.css'

const { Text } = Typography

type ResidenceRecordType = 'TEMPORARY_STAY' | 'TEMPORARY_ABSENCE'
type ResidenceRecordStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type ResidenceTab = 'ALL' | ResidenceRecordStatus

type ResidenceRecordApi = {
  id?: number | string
  recordCode?: number | string
  type?: string
  status?: string
  submittedByName?: string
  relatedPersonName?: string
  residentName?: string
  guestName?: string
  buildingCode?: string
  apartmentCode?: string
  startDate?: string
  endDate?: string | null
  reason?: string | null
  guestCccd?: string | null
  guestPhone?: string | null
  cccd?: string | null
}

type ResidenceRecordRow = {
  id: number
  recordCode: string
  type: ResidenceRecordType
  status: ResidenceRecordStatus
  relatedPersonName: string
  apartmentCode: string
  startDate: string
  endDate: string | null
  reason: string
  guestCccd: string
  guestPhone: string
}

type ApartmentOption = {
  buildingCode: string
  apartmentCode: string
}

const APARTMENT_CODE_PATTERN = /^(A1|A2|B1)-(0[1-9]|10)(0[1-8])$/

const TYPE_LABEL: Record<ResidenceRecordType, string> = {
  TEMPORARY_STAY: 'Tạm trú',
  TEMPORARY_ABSENCE: 'Tạm vắng',
}

const TYPE_COLOR: Record<ResidenceRecordType, string> = {
  TEMPORARY_STAY: 'blue',
  TEMPORARY_ABSENCE: 'orange',
}

const STATUS_LABEL: Record<ResidenceRecordStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

const STATUS_COLOR: Record<ResidenceRecordStatus, string> = {
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
}

const STATUS_SORT_ORDER: Record<ResidenceRecordStatus, number> = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
}

const parseIntSafe = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toRecordType = (value: unknown): ResidenceRecordType | null => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'TEMPORARY_STAY' || normalized === 'TEMPORARY_ABSENCE') {
    return normalized
  }
  return null
}

const toRecordStatus = (value: unknown): ResidenceRecordStatus | null => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'PENDING' || normalized === 'APPROVED' || normalized === 'REJECTED') {
    return normalized
  }
  return null
}

const normalizeResidenceRecord = (source: ResidenceRecordApi): ResidenceRecordRow | null => {
  const type = toRecordType(source.type)
  const status = toRecordStatus(source.status)
  if (!type || !status) return null

  const buildingCode = String(source.buildingCode || '').toUpperCase().trim()
  const apartmentCode = String(source.apartmentCode || '').toUpperCase().trim()

  if (!buildingCode || !apartmentCode || !APARTMENT_CODE_PATTERN.test(apartmentCode) || !apartmentCode.startsWith(`${buildingCode}-`)) {
    return null
  }

  const startDate = source.startDate ? dayjs(source.startDate).format('YYYY-MM-DD') : null
  if (!startDate || !dayjs(startDate).isValid()) {
    return null
  }

  const endDate = source.endDate ? dayjs(source.endDate).format('YYYY-MM-DD') : null

  const relatedPersonName = String(source.relatedPersonName || source.guestName || source.residentName || '').trim() || 'Chưa cập nhật'

  return {
    id: parseIntSafe(source.id, 0),
    recordCode: String(source.recordCode || source.id || '-'),
    type,
    status,
    relatedPersonName,
    apartmentCode,
    startDate,
    endDate,
    reason: String(source.reason || '').trim() || '-',
    guestCccd: String(source.guestCccd || source.cccd || '').trim() || '-',
    guestPhone: String(source.guestPhone || '').trim() || '-',
  }
}

const ResidenceManagement: React.FC = () => {
  const [records, setRecords] = useState<ResidenceRecordRow[]>([])
  const [invalidRowCount, setInvalidRowCount] = useState(0)
  const [apartmentOptions, setApartmentOptions] = useState<ApartmentOption[]>([])

  const [loading, setLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<ResidenceTab>('ALL')
  const [keyword, setKeyword] = useState('')
  const [buildingFilter, setBuildingFilter] = useState<string | undefined>()
  const [apartmentFilter, setApartmentFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<ResidenceRecordType | undefined>()

  const [selectedRecord, setSelectedRecord] = useState<ResidenceRecordRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchApartmentOptions = async (targetBuildingCode?: string) => {
    setOptionsLoading(true)
    try {
      const response = await api.get('/apartments', {
        params: targetBuildingCode ? { buildingCode: targetBuildingCode } : undefined,
      })
      const payload = Array.isArray(response.data) ? response.data : []
      const normalized = payload
        .map((item: unknown) => {
          const it = item as Record<string, unknown>
          const apartmentCode = String(it.code || '').toUpperCase().trim()
          if (!APARTMENT_CODE_PATTERN.test(apartmentCode)) return null
          const buildingCode = String(it.buildingCode || apartmentCode.split('-')[0] || '').toUpperCase().trim()
          return { buildingCode, apartmentCode } as ApartmentOption
        })
        .filter((item: ApartmentOption | null): item is ApartmentOption => item !== null)

      setApartmentOptions(normalized)
    } catch (err: unknown) {
      message.error(extractApiError(err, 'Không thể tải danh sách căn hộ'))
    } finally {
      setOptionsLoading(false)
    }
  }

  const fetchRecords = async () => {
    setLoading(true)
    setError(null)

    try {
      const params: Record<string, string> = {}
      if (keyword.trim()) params.keyword = keyword.trim()
      if (buildingFilter) params.buildingCode = buildingFilter
      if (apartmentFilter) params.apartmentCode = apartmentFilter
      if (typeFilter) params.type = typeFilter

      const response = await api.get('/residence-records', { params })
      const payload = Array.isArray(response.data) ? response.data : []
      const normalized = payload.map((item: ResidenceRecordApi) => normalizeResidenceRecord(item))
      const validRows = normalized
        .filter((item): item is ResidenceRecordRow => item !== null)
        .sort((a, b) => {
          const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]
          if (statusDiff !== 0) return statusDiff

          const dateDiff = dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf()
          if (dateDiff !== 0) return dateDiff

          return b.id - a.id
        })

      setRecords(validRows)
      setInvalidRowCount(normalized.length - validRows.length)
    } catch (err: unknown) {
      setRecords([])
      setInvalidRowCount(0)
      setError(extractApiError(err, 'Không thể tải dữ liệu hồ sơ cư trú'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchApartmentOptions(buildingFilter)
  }, [buildingFilter])

  useEffect(() => {
    if (buildingFilter && apartmentFilter && !apartmentFilter.startsWith(`${buildingFilter}-`)) {
      setApartmentFilter(undefined)
    }
  }, [buildingFilter, apartmentFilter])

  useEffect(() => {
    void fetchRecords()
  }, [activeTab, keyword, buildingFilter, apartmentFilter, typeFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, keyword, buildingFilter, apartmentFilter, typeFilter])

  const handleOpenDetail = (record: ResidenceRecordRow) => {
    setSelectedRecord(record)
    setDrawerOpen(true)
  }

  const submitDecision = async (record: ResidenceRecordRow, action: 'APPROVE' | 'REJECT') => {
    setSubmitting(true)
    try {
      await api.patch(`/residence-records/${record.id}/decision`, { action, note: null })
      message.success(action === 'APPROVE' ? 'Duyệt hồ sơ thành công' : 'Từ chối hồ sơ thành công')
      await fetchRecords()
      if (selectedRecord?.id === record.id) {
        setSelectedRecord({
          ...selectedRecord,
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        })
      }
    } catch (err: unknown) {
      message.error(extractApiError(err, 'Cập nhật trạng thái hồ sơ thất bại'))
    } finally {
      setSubmitting(false)
    }
  }

  const openApproveConfirm = (record: ResidenceRecordRow) => {
    Modal.confirm({
      title: 'Xác nhận duyệt hồ sơ',
      icon: <CheckCircleOutlined className="residence-confirm-icon success" />,
      content: 'Bạn có chắc chắn muốn duyệt hồ sơ này?',
      centered: true,
      className: 'residence-confirm-modal',
      okText: 'Duyệt',
      cancelText: 'Hủy',
      okButtonProps: { className: 'residence-confirm-ok approve' },
      cancelButtonProps: { className: 'residence-confirm-cancel' },
      onOk: () => submitDecision(record, 'APPROVE'),
    })
  }

  const openRejectConfirm = (record: ResidenceRecordRow) => {
    Modal.confirm({
      title: 'Xác nhận từ chối hồ sơ',
      icon: <CloseCircleOutlined className="residence-confirm-icon reject" />,
      content: 'Bạn có chắc chắn muốn từ chối hồ sơ này?',
      centered: true,
      className: 'residence-confirm-modal',
      okText: 'Từ chối',
      cancelText: 'Hủy',
      okButtonProps: { className: 'residence-confirm-ok reject', danger: true },
      cancelButtonProps: { className: 'residence-confirm-cancel' },
      onOk: () => submitDecision(record, 'REJECT'),
    })
  }

  const columns: ColumnsType<ResidenceRecordRow> = [
    {
      title: 'Loại hồ sơ',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (value: ResidenceRecordType) => <Tag color={TYPE_COLOR[value]}>{TYPE_LABEL[value]}</Tag>,
    },
    {
      title: 'Người liên quan',
      dataIndex: 'relatedPersonName',
      key: 'relatedPersonName',
      width: 170,
      ellipsis: true,
    },
    {
      title: 'Căn hộ',
      dataIndex: 'apartmentCode',
      key: 'apartmentCode',
      width: 110,
      align: 'center',
      render: (value: string) => <Text className="residence-apartment-cell">{value}</Text>,
    },
    {
      title: 'Thời gian',
      key: 'duration',
      width: 180,
      render: (_, record) => {
        const start = dayjs(record.startDate).format('DD/MM/YYYY')
        const end = record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : '-'
        return <Text>{`${start} - ${end}`}</Text>
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: 170,
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value === '-' ? undefined : value}>
          <Text>{value}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: ResidenceRecordStatus) => <Badge color={STATUS_COLOR[value]} text={STATUS_LABEL[value]} />,
    },
    {
      title: 'Action',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={8} className="residence-action-group">
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Duyệt">
                <Button
                  className="residence-action-btn approve"
                  type="text"
                  icon={<CheckOutlined />}
                  loading={submitting}
                  onClick={() => openApproveConfirm(record)}
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button
                  className="residence-action-btn reject"
                  type="text"
                  icon={<CloseOutlined />}
                  disabled={submitting}
                  onClick={() => openRejectConfirm(record)}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Chi tiết">
            <Button className="residence-action-btn view" type="text" icon={<EyeOutlined />} onClick={() => handleOpenDetail(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const tabItems = useMemo(() => {
    const pending = records.filter((item) => item.status === 'PENDING').length
    const approved = records.filter((item) => item.status === 'APPROVED').length
    const rejected = records.filter((item) => item.status === 'REJECTED').length

    return [
      { key: 'ALL', label: `Tất cả (${records.length})` },
      { key: 'PENDING', label: `Chờ duyệt (${pending})` },
      { key: 'APPROVED', label: `Đã duyệt (${approved})` },
      { key: 'REJECTED', label: `Từ chối (${rejected})` },
    ]
  }, [records])

  const visibleRecords = useMemo(() => {
    if (activeTab === 'ALL') {
      return records
    }
    return records.filter((item) => item.status === activeTab)
  }, [activeTab, records])

  const totalRecords = visibleRecords.length
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE)
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pagedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return visibleRecords.slice(start, start + PAGE_SIZE)
  }, [safeCurrentPage, visibleRecords])

  const visibleApartmentOptions = useMemo(() => apartmentOptions
    .filter((item) => !buildingFilter || item.buildingCode === buildingFilter)
    .map((item) => ({ value: item.apartmentCode, label: item.apartmentCode })), [apartmentOptions, buildingFilter])

  const emptyDescription = keyword || buildingFilter || apartmentFilter || typeFilter || activeTab !== 'ALL'
    ? 'Không có hồ sơ phù hợp bộ lọc'
    : 'Chưa có hồ sơ cư trú'

  return (
    <div className="residence-page">
      <Card className="residence-filter-card" style={{ marginBottom: 16 }}>
        <Row align="middle" gutter={[12, 12]}>
          <Col xs={24} md={10} lg={8}>
            <Input
              allowClear
              className="residence-filter-control residence-search-input"
              placeholder="Search người gửi / người liên quan"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </Col>

          <Col xs={12} md={7} lg={4}>
            <Select
              allowClear
              className="residence-filter-control"
              style={{ width: '100%' }}
              value={buildingFilter}
              placeholder="Theo tòa"
              options={[
                { value: 'A1', label: 'A1' },
                { value: 'A2', label: 'A2' },
                { value: 'B1', label: 'B1' },
              ]}
              onChange={(value) => {
                setBuildingFilter(value)
                setApartmentFilter(undefined)
              }}
            />
          </Col>

          <Col xs={12} md={7} lg={4}>
            <Select
              allowClear
              className="residence-filter-control"
              style={{ width: '100%' }}
              loading={optionsLoading}
              value={apartmentFilter}
              placeholder="Theo căn hộ"
              options={visibleApartmentOptions}
              onChange={(value) => setApartmentFilter(value)}
            />
          </Col>

          <Col xs={12} md={7} lg={4}>
            <Select
              allowClear
              className="residence-filter-control"
              style={{ width: '100%' }}
              value={typeFilter}
              placeholder="Loại hồ sơ"
              options={[
                { value: 'TEMPORARY_STAY', label: 'Tạm trú' },
                { value: 'TEMPORARY_ABSENCE', label: 'Tạm vắng' },
              ]}
              onChange={(value) => setTypeFilter(value)}
            />
          </Col>

          <Col xs={12} md={7} lg={4}>
            <div className="residence-filter-actions">
              <Button
                type="default"
                danger
                ghost
                onClick={() => {
                  setKeyword('')
                  setBuildingFilter(undefined)
                  setApartmentFilter(undefined)
                  setTypeFilter(undefined)
                }}
              >
                Xóa lọc
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

      {invalidRowCount > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Đã loại bỏ ${invalidRowCount} bản ghi không hợp lệ.`}
        />
      )}

      <Card>
        <Tabs activeKey={activeTab} items={tabItems} onChange={(key) => setActiveTab(key as ResidenceTab)} />

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={pagedRecords}
          size="small"
          tableLayout="fixed"
          locale={{
            emptyText: (
              <Empty
                description={emptyDescription}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          pagination={false}
        />

        <SlidingPaginationFooter
          total={totalRecords}
          currentPage={safeCurrentPage}
          onPageChange={setCurrentPage}
          totalLabel={`Tổng ${totalRecords} hồ sơ`}
        />
      </Card>

      <Drawer
        open={drawerOpen}
        title="Chi tiết hồ sơ cư trú"
        size={520}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
      >
        {!selectedRecord ? null : (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Mã hồ sơ">#{selectedRecord.recordCode}</Descriptions.Item>
            <Descriptions.Item label="Loại hồ sơ"><Tag color={TYPE_COLOR[selectedRecord.type]}>{TYPE_LABEL[selectedRecord.type]}</Tag></Descriptions.Item>
            <Descriptions.Item label="Người liên quan">{selectedRecord.relatedPersonName}</Descriptions.Item>
            <Descriptions.Item label="Căn hộ">{selectedRecord.apartmentCode}</Descriptions.Item>
            <Descriptions.Item label="Bắt đầu">{dayjs(selectedRecord.startDate).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Kết thúc">{selectedRecord.endDate ? dayjs(selectedRecord.endDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Lý do">{selectedRecord.reason}</Descriptions.Item>
            <Descriptions.Item label="Guest CCCD">{selectedRecord.guestCccd}</Descriptions.Item>
            <Descriptions.Item label="Guest SĐT">{selectedRecord.guestPhone}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><Badge color={STATUS_COLOR[selectedRecord.status]} text={STATUS_LABEL[selectedRecord.status]} /></Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}

export default ResidenceManagement
