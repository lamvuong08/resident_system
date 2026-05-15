import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api, { extractApiError } from '../../utils/api'
import { formatDateVN, formatResidentRelationship, formatResidentGender } from '../../utils/resident'
import { displayInitials } from '../../utils/displayInitials'
import { relationshipRoleBadge } from '../../utils/householdProfile'
import SlidingPaginationFooter from '../../components/SlidingPaginationFooter'
import { PAGE_SIZE } from '../../utils/pagination'
import '../../styles/resident-management.css'
import '../../styles/profile-household-page.css'

const { Text } = Typography

type ResidentCategory = 'OFFICIAL' | 'TEMPORARY'
type OccupancyStatus = 'LIVING' | 'TEMP_ABSENT' | 'EXPIRED'
type ResidentViewFilter = 'ALL' | 'LIVING' | 'TEMP_ABSENT' | 'TEMPORARY' | 'EXPIRED'

type ResidentApi = {
  id?: number | string
  name?: string
  fullName?: string
  dob?: string | null
  cccd?: string | null
  phone?: string | null
  relationship?: string | null
  householdId?: number | string | null
  gender?: string | null
  residentCategory?: ResidentCategory | null
  occupancyStatus?: OccupancyStatus | null
  status?: string | null
  apartmentCode?: string | null
  buildingCode?: string | null
}

type BuildingOption = {
  code: string
  name: string
}

type ApartmentOption = {
  id?: number
  code: string
  buildingCode: string
}

type ResidentRow = {
  key: string
  id: number | string
  fullName: string
  apartmentCode: string
  residentCategory: ResidentCategory
  occupancyStatus: OccupancyStatus
  cccd: string
  dob: string | null
  dobLabel: string
  phone: string
  relationship: string
  buildingCode: string
  raw: ResidentApi
}

type ResidentFormValues = {
  name: string
  dob?: dayjs.Dayjs
  cccd?: string
  phone?: string
  relationship?: string
  gender?: string
  apartmentCode: string
}

const APARTMENT_CODE_PATTERN = /^([A-Za-z0-9]+)-/i

const OCCUPANCY_LABEL: Record<OccupancyStatus, string> = {
  LIVING: 'Đang ở',
  TEMP_ABSENT: 'Tạm vắng',
  EXPIRED: 'Hết hạn',
}

const OCCUPANCY_COLOR: Record<OccupancyStatus, string> = {
  LIVING: 'green',
  TEMP_ABSENT: 'orange',
  EXPIRED: 'default',
}

const apartmentCodeCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

const CATEGORY_LABEL: Record<ResidentCategory, string> = {
  OFFICIAL: 'Chính thức',
  TEMPORARY: 'Tạm trú',
}

const toNumberSafe = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeApartmentCode = (value: unknown) => String(value || '').trim().toUpperCase()

const getBuildingCodeFromApartmentCode = (code?: string | null) => {
  if (!code) return ''
  const trimmed = String(code).trim().toUpperCase()
  const matched = trimmed.match(APARTMENT_CODE_PATTERN)
  if (matched?.[1]) return matched[1].toUpperCase()
  return ''
}

const toOccupancyStatus = (resident: ResidentApi): OccupancyStatus => {
  const occupancy = String(resident.occupancyStatus || '').toUpperCase()
  if (occupancy === 'LIVING' || occupancy === 'TEMP_ABSENT' || occupancy === 'EXPIRED') {
    return occupancy
  }

  const legacy = String(resident.status || '').toUpperCase()
  if (legacy === 'TEMPORARY_ABSENCE') return 'TEMP_ABSENT'
  if (legacy === 'MOVED_OUT') return 'EXPIRED'
  return 'LIVING'
}

const toResidentCategory = (resident: ResidentApi): ResidentCategory => {
  const category = String(resident.residentCategory || '').toUpperCase()
  if (category === 'OFFICIAL' || category === 'TEMPORARY') {
    return category
  }
  return 'OFFICIAL'
}

const toResidentRow = (source: ResidentApi): ResidentRow => {
  const apartmentCode = normalizeApartmentCode(source.apartmentCode)
  const buildingCode = normalizeApartmentCode(source.buildingCode || getBuildingCodeFromApartmentCode(apartmentCode))

  const fullName = String(source.fullName || source.name || '').trim() || 'Chưa cập nhật'
  const cccd = String(source.cccd || '').trim() || '-'
  const phone = String(source.phone || '').trim() || '-'

  return {
    key: String(source.id ?? `${fullName}-${cccd}`),
    id: source.id ?? '-',
    fullName,
    apartmentCode: apartmentCode || '-',
    residentCategory: toResidentCategory(source),
    occupancyStatus: toOccupancyStatus(source),
    cccd,
    dob: source.dob || null,
    dobLabel: formatDateVN(source.dob || null),
    phone,
    relationship: formatResidentRelationship(source.relationship),
    buildingCode,
    raw: source,
  }
}

const ResidentManagement: React.FC = () => {
  const [form] = Form.useForm<ResidentFormValues>()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<ResidentRow[]>([])
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [allApartments, setAllApartments] = useState<ApartmentOption[]>([])
  const [apartmentOptions, setApartmentOptions] = useState<ApartmentOption[]>([])

  const [keyword, setKeyword] = useState('')
  const [viewFilter, setViewFilter] = useState<ResidentViewFilter>('ALL')
  const [buildingFilter, setBuildingFilter] = useState<string | undefined>()
  const [apartmentFilter, setApartmentFilter] = useState<string | undefined>()

  const [currentPage, setCurrentPage] = useState(1)
  const [drawerResident, setDrawerResident] = useState<ResidentRow | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingResident, setEditingResident] = useState<ResidentRow | null>(null)
  const [editorBuildingCode, setEditorBuildingCode] = useState<string | undefined>()
  const [editorApartments, setEditorApartments] = useState<ApartmentOption[]>([])

  const loadBuildings = async () => {
    const response = await api.get('/dashboard/buildings')
    const payload = Array.isArray(response.data) ? response.data : []

    const normalized = payload
      .map((item: unknown) => {
        const it = item as Record<string, unknown>
        const idOrCode = String(it.code ?? it.id ?? '')
        return {
          code: idOrCode.toUpperCase().trim(),
          name: String(it.name ?? '').trim() || idOrCode.toUpperCase().trim(),
        }
      })
      .filter((item: BuildingOption) => item.code)

    setBuildings(normalized)
  }

  const fetchApartments = async (targetBuildingCode?: string) => {
    const response = await api.get('/apartments', {
      params: targetBuildingCode ? { buildingCode: targetBuildingCode } : undefined,
    })

    const payload = Array.isArray(response.data) ? response.data : []
    const normalized = payload
      .map((item: unknown) => {
        const it = item as Record<string, unknown>
        const code = normalizeApartmentCode(it?.code)
        if (!code) return null

        const buildingCode = normalizeApartmentCode(it?.buildingCode || getBuildingCodeFromApartmentCode(code))
        if (!buildingCode) return null
        return {
          id: toNumberSafe(it?.id) ?? undefined,
          code,
          buildingCode,
        } as ApartmentOption
      })
      .filter((item: ApartmentOption | null): item is ApartmentOption => item !== null)

    setApartmentOptions(normalized)
    return normalized
  }

  const loadResidents = async () => {
    const params: Record<string, string | boolean> = {}
    if (buildingFilter) params.buildingCode = buildingFilter
    if (apartmentFilter) params.apartmentCode = apartmentFilter
    if (keyword.trim()) params.keyword = keyword.trim()
    params.view = viewFilter
    params.includeHistory = viewFilter === 'EXPIRED'

    const response = await api.get('/residents', { params })
    const payload = Array.isArray(response.data) ? response.data : []
    return payload as ResidentApi[]
  }

  const refreshData = async () => {
    setLoading(true)
    setError(null)
    try {
      await loadBuildings()
      const apartments = await fetchApartments(buildingFilter)
      setAllApartments(apartments)
      const residents = await loadResidents()
      setRows(residents.map((item) => toResidentRow(item)))
    } catch (err: unknown) {
      setRows([])
      setError(extractApiError(err, 'Không thể tải dữ liệu cư dân từ database'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshData()
  }, [buildingFilter, apartmentFilter, viewFilter, keyword])

  useEffect(() => {
    setCurrentPage(1)
  }, [buildingFilter, apartmentFilter, viewFilter, keyword])

  useEffect(() => {
    setApartmentFilter(undefined)
  }, [buildingFilter])

  const displayedRows = useMemo(() => {
    return rows
      .filter((row) => {
        if (viewFilter === 'LIVING') return row.occupancyStatus === 'LIVING' && row.residentCategory === 'OFFICIAL'
        if (viewFilter === 'TEMP_ABSENT') return row.occupancyStatus === 'TEMP_ABSENT'
        if (viewFilter === 'TEMPORARY') return row.residentCategory === 'TEMPORARY' && row.occupancyStatus === 'LIVING'
        if (viewFilter === 'EXPIRED') return row.occupancyStatus === 'EXPIRED'
        return true
      })
      .sort((a, b) => {
        const buildingCompare = apartmentCodeCollator.compare(a.buildingCode || '', b.buildingCode || '')
        if (buildingCompare !== 0) return buildingCompare

        const apartmentCompare = apartmentCodeCollator.compare(a.apartmentCode || '', b.apartmentCode || '')
        if (apartmentCompare !== 0) return apartmentCompare

        const nameCompare = apartmentCodeCollator.compare(a.fullName || '', b.fullName || '')
        if (nameCompare !== 0) return nameCompare

        const aId = Number(a.id)
        const bId = Number(b.id)
        if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId
        return String(a.id).localeCompare(String(b.id))
      })
  }, [rows, viewFilter])

  const totalRows = displayedRows.length
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pagedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return displayedRows.slice(start, start + PAGE_SIZE)
  }, [displayedRows, safeCurrentPage])

  const buildingOptions = useMemo(() => buildings.map((building) => ({
    value: building.code,
    label: `${building.name} (${building.code})`,
  })), [buildings])

  const apartmentSelectOptions = useMemo(() => apartmentOptions
    .filter((item) => !buildingFilter || item.buildingCode === buildingFilter)
    .map((item) => ({ value: item.code, label: item.code })), [apartmentOptions, buildingFilter])

  const handleRefresh = async () => {
    await refreshData()
    message.success('Đã làm mới dữ liệu cư dân')
  }

  const resolveHouseholdId = async (apartmentCode: string) => {
    const response = await api.post(`/apartments/${apartmentCode}/household`)
    const householdId = toNumberSafe(response.data?.householdId)
    if (!householdId) {
      throw new Error('Không thể xác định hộ khẩu cho căn hộ đã chọn')
    }
    return householdId
  }

  const handleDelete = async (row: ResidentRow) => {
    setSubmitting(true)
    try {
      await api.delete(`/residents/${row.id}`)
      message.success('Đã xóa cư dân')
      await refreshData()
    } catch (err: unknown) {
      message.error(extractApiError(err, 'Xóa cư dân thất bại'))
    } finally {
      setSubmitting(false)
    }
  }

  const openCreateModal = () => {
    setEditingResident(null)
    setEditorBuildingCode(undefined)
    setEditorApartments(allApartments)
    form.resetFields()
    setEditorOpen(true)
  }

  const openEditModal = (row: ResidentRow) => {
    setEditingResident(row)
    setEditorBuildingCode(row.buildingCode || undefined)
    setEditorApartments(allApartments.filter((item) => !row.buildingCode || item.buildingCode === row.buildingCode))

    form.setFieldsValue({
      name: row.fullName,
      dob: row.dob ? dayjs(row.dob) : undefined,
      cccd: row.cccd === '-' ? '' : row.cccd,
      phone: row.phone === '-' ? '' : row.phone,
      relationship: row.raw.relationship || undefined,
      gender: row.raw.gender || undefined,
      apartmentCode: row.apartmentCode !== '-' ? row.apartmentCode : undefined,
    })

    setEditorOpen(true)
  }

  const handleEditorBuildingChange = async (buildingCode: string) => {
    setEditorBuildingCode(buildingCode)
    form.setFieldValue('apartmentCode', undefined)

    try {
      const response = await api.get('/apartments', { params: buildingCode ? { buildingCode } : undefined })
      const payload = Array.isArray(response.data) ? response.data : []
      const normalized = payload
        .map((item: unknown) => {
          const it = item as Record<string, unknown>
          const code = normalizeApartmentCode(it?.code)
          if (!code) return null
          return {
            id: toNumberSafe(it?.id) ?? undefined,
            code,
            buildingCode,
          } as ApartmentOption
        })
        .filter((item: ApartmentOption | null): item is ApartmentOption => item !== null)

      setEditorApartments(normalized)
    } catch (err: unknown) {
      setEditorApartments([])
      message.error(extractApiError(err, 'Không thể tải căn hộ theo tòa đã chọn'))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const householdId = await resolveHouseholdId(values.apartmentCode)
      const payload = {
        name: values.name.trim(),
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        cccd: values.cccd?.trim() || null,
        phone: values.phone?.trim() || null,
        relationship: values.relationship || 'OTHER',
        gender: values.gender || null,
        householdId,
      }

      if (editingResident) {
        await api.put(`/residents/${editingResident.id}`, payload)
        message.success('Đã cập nhật cư dân')
      } else {
        await api.post('/residents', payload)
        message.success('Đã thêm cư dân')
      }

      setEditorOpen(false)
      await refreshData()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(extractApiError(err, 'Lưu cư dân thất bại'))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<ResidentRow> = [
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 170,
      ellipsis: true,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: 'Căn hộ',
      dataIndex: 'apartmentCode',
      key: 'apartmentCode',
      width: 110,
      align: 'center',
      render: (value: string) => <Text className="resident-apartment-code">{value}</Text>,
    },
    {
      title: 'Loại cư dân',
      dataIndex: 'residentCategory',
      key: 'residentCategory',
      width: 110,
      align: 'center',
      render: (value: ResidentCategory) => <Tag color={value === 'OFFICIAL' ? 'blue' : 'gold'}>{CATEGORY_LABEL[value]}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'occupancyStatus',
      key: 'occupancyStatus',
      width: 120,
      align: 'center',
      render: (value: OccupancyStatus) => <Badge color={OCCUPANCY_COLOR[value]} text={OCCUPANCY_LABEL[value]} />,
    },
    {
      title: 'CCCD',
      dataIndex: 'cccd',
      key: 'cccd',
      width: 130,
      align: 'center',
      ellipsis: true,
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dobLabel',
      key: 'dobLabel',
      width: 110,
      align: 'center',
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      align: 'center',
      ellipsis: true,
    },
    {
      title: 'Quan hệ',
      dataIndex: 'relationship',
      key: 'relationship',
      width: 110,
      align: 'center',
      ellipsis: true,
    },
    {
      title: 'Action',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, row) => (
        <Space size={6} className="resident-action-group">
          <Button className="resident-action-btn view" type="text" icon={<EyeOutlined />} onClick={() => setDrawerResident(row)} />
          <Button className="resident-action-btn edit" type="text" icon={<EditOutlined />} onClick={() => openEditModal(row)} />
          <Popconfirm title="Xóa cư dân này?" okText="Xóa" cancelText="Hủy" onConfirm={() => void handleDelete(row)}>
            <Button className="resident-action-btn delete" type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const isFiltered = Boolean(keyword.trim() || buildingFilter || apartmentFilter || viewFilter !== 'ALL')

  return (
    <div className="resident-management-page">
      <Card className="resident-filter-card" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8} lg={7}>
            <Input
              allowClear
              className="resident-filter-control"
              placeholder="Search tên / CCCD"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </Col>

          <Col xs={12} md={8} lg={4}>
            <Select
              className="resident-filter-control"
              value={viewFilter}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'LIVING', label: 'Đang ở' },
                { value: 'TEMP_ABSENT', label: 'Tạm vắng' },
                { value: 'TEMPORARY', label: 'Tạm trú' },
                { value: 'EXPIRED', label: 'Hết hạn' },
              ]}
              onChange={(value) => setViewFilter(value)}
            />
          </Col>

          <Col xs={12} md={8} lg={4}>
            <Select
              allowClear
              className="resident-filter-control"
              value={buildingFilter}
              placeholder="Theo tòa"
              options={buildingOptions}
              onChange={(value) => setBuildingFilter(value)}
            />
          </Col>

          <Col xs={12} md={8} lg={4}>
            <Select
              allowClear
              className="resident-filter-control"
              value={apartmentFilter}
              placeholder="Theo căn hộ"
              options={apartmentSelectOptions}
              onChange={(value) => setApartmentFilter(value)}
            />
          </Col>

          <Col xs={12} md={8} lg={5}>
            <Space className="resident-filter-actions" wrap>
              <Button className="resident-toolbar-btn" icon={<ReloadOutlined />} onClick={() => void handleRefresh()}>
                Làm mới
              </Button>
              <Button className="resident-toolbar-btn" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                Thêm
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error && <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} />}

      <Card className="resident-table-card">
        {/* Title and subtitle removed as requested */}

        <Table
          rowKey="key"
          loading={loading}
          size="small"
          tableLayout="fixed"
          columns={columns}
          dataSource={pagedRows}
          locale={{
            emptyText: (
              <Empty
                description={isFiltered ? 'Không có cư dân phù hợp bộ lọc' : 'Chưa có dữ liệu cư dân'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          pagination={false}
        />

        <SlidingPaginationFooter
          total={totalRows}
          currentPage={safeCurrentPage}
          onPageChange={setCurrentPage}
          totalLabel={`Tổng ${totalRows} cư dân`}
        />
      </Card>

      <Drawer
        open={Boolean(drawerResident)}
        onClose={() => setDrawerResident(null)}
        title={null}
        placement="right"
        size="default"
        destroyOnClose
        className="profile-household__resident-drawer"
      >
        {!drawerResident ? null : (
          (() => {
            const initials = displayInitials(drawerResident.fullName)
            const role = relationshipRoleBadge(drawerResident.raw.relationship)
            const formatChunk = (value: string | null | undefined) => {
              const raw = String(value || '').replace(/\s+/g, '')
              if (!raw || raw === '-') return '—'
              return raw.replace(/(.{4})/g, '$1 ').trim()
            }
            const renderRow = (label: string, value: string) => (
              <div className="ph-drawer-row">
                <dt>{label}</dt>
                <dd>{value || '—'}</dd>
              </div>
            )
            return (
              <div className="ph-drawer-detail">
                <header className="ph-drawer-hero">
                  <Avatar size={56} className="ph-drawer-avatar">
                    {initials}
                  </Avatar>
                  <h2 className="ph-drawer-name">{drawerResident.fullName}</h2>
                  <Tag color={role.color} className="ph-drawer-role-tag">
                    {drawerResident.relationship}
                  </Tag>
                </header>

                <section className="ph-drawer-section">
                  <h3 className="ph-drawer-section__label">Thông tin cá nhân</h3>
                  <dl className="ph-drawer-dl">
                    {renderRow('Giới tính', formatResidentGender(drawerResident.raw.gender))}
                    {renderRow('Ngày sinh', drawerResident.dobLabel !== '-' && drawerResident.dobLabel ? drawerResident.dobLabel : '—')}
                    {renderRow('CCCD', formatChunk(drawerResident.cccd))}
                  </dl>
                </section>

                <section className="ph-drawer-section">
                  <h3 className="ph-drawer-section__label">Liên hệ</h3>
                  <dl className="ph-drawer-dl">
                    {renderRow('Số điện thoại', formatChunk(drawerResident.phone))}
                  </dl>
                </section>

                <section className="ph-drawer-section">
                  <h3 className="ph-drawer-section__label">Hộ khẩu</h3>
                  <dl className="ph-drawer-dl">
                    {renderRow('Căn hộ', drawerResident.apartmentCode || '—')}
                    <div className="ph-drawer-row">
                      <dt>Loại cư dân</dt>
                      <dd>
                        <Tag color={drawerResident.residentCategory === 'OFFICIAL' ? 'blue' : 'gold'}>
                          {CATEGORY_LABEL[drawerResident.residentCategory]}
                        </Tag>
                      </dd>
                    </div>
                    <div className="ph-drawer-row">
                      <dt>Trạng thái</dt>
                      <dd>
                        <Tag color={OCCUPANCY_COLOR[drawerResident.occupancyStatus]} className="ph-drawer-status-tag">
                          {OCCUPANCY_LABEL[drawerResident.occupancyStatus]}
                        </Tag>
                      </dd>
                    </div>
                  </dl>
                </section>

                <div className="ph-drawer-actions">
                  <Button
                    type="primary"
                    className="ph-drawer-btn ph-drawer-btn--primary"
                    onClick={() => {
                      setDrawerResident(null)
                      openEditModal(drawerResident)
                    }}
                  >
                    Cập nhật
                  </Button>
                </div>
              </div>
            )
          })()
        )}
      </Drawer>

      <Modal
        open={editorOpen}
        title={editingResident ? 'Chỉnh sửa cư dân' : 'Thêm cư dân'}
        onCancel={() => setEditorOpen(false)}
        onOk={() => void handleSubmit()}
        okText={editingResident ? 'Lưu' : 'Tạo'}
        cancelText="Hủy"
        confirmLoading={submitting}
        className="resident-editor-modal"
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={24}>
              <Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="dob" label="Ngày sinh">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="cccd" label="CCCD">
                <Input maxLength={20} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="phone" label="SĐT">
                <Input maxLength={20} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="relationship" label="Quan hệ" initialValue="OTHER">
                <Select
                  options={[
                    { value: 'HEAD', label: 'Chủ hộ' },
                    { value: 'SPOUSE', label: 'Vợ / Chồng' },
                    { value: 'CHILD', label: 'Con' },
                    { value: 'PARENT', label: 'Cha / Mẹ' },
                    { value: 'OTHER', label: 'Khác' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="gender" label="Giới tính">
                <Select
                  allowClear
                  placeholder="Chọn giới tính"
                  options={[
                    { value: 'MALE', label: 'Nam' },
                    { value: 'FEMALE', label: 'Nữ' },
                    { value: 'OTHER', label: 'Khác' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Tòa nhà" required>
                <Select
                  allowClear
                  value={editorBuildingCode}
                  placeholder="Chọn tòa"
                  options={buildingOptions}
                  onChange={(value) => void handleEditorBuildingChange(value)}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="apartmentCode" label="Căn hộ" rules={[{ required: true, message: 'Vui lòng chọn căn hộ' }]}>
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn căn hộ"
                  options={editorApartments.map((item) => ({ value: item.code, label: item.code }))}
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default ResidentManagement
