import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, DatePicker, Empty, Form, Input, Modal, Select, Skeleton, Space, Table, Tabs, Tag, Tooltip, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { type Dayjs } from 'dayjs'
import type { HouseholdSummary } from '../../types/residentDashboard'
import type { MyHouseholdResident } from '../../types/householdProfile'
import {
  createResidenceRecordRequest,
  cancelResidenceRecordRequest,
  displayTemporaryStayGuestRelationship,
  displayTemporaryStayReasonOnly,
  fetchMyResidenceRecords,
  formatResidenceRecordDate,
  getResidenceRecordStatusColor,
  getResidenceRecordStatusLabel,
  getResidenceRecordTypeColor,
  getResidenceRecordTypeLabel,
  RESIDENCE_RECORD_TYPE,
  updateResidenceRecordRequest,
  type ResidenceRecordRow,
  type ResidenceRecordTypeValue,
  type ResidenceRecordCreatePayload,
} from '../../utils/userSupportApi'
import api, { extractApiError } from '../../utils/api'
import '../../styles/resident-dashboard.css'
import '../../styles/profile-household-page.css'
import '../../styles/temporary-residence.css'

const { Text, Paragraph } = Typography

type TemporaryStayFormValues = {
  guestName: string
  guestCccd: string
  guestPhone: string
  relationship: string
  reason: string
  startDate: Dayjs
  endDate: Dayjs
}

type TemporaryAbsenceFormValues = {
  residentId: number
  reason: string
  startDate: Dayjs
  endDate: Dayjs
}

type TemporaryResidenceEditFormValues = {
  residentId?: number
  guestName?: string
  guestCccd?: string
  guestPhone?: string
  guestRelationship?: string
  reason?: string
  startDate?: Dayjs
  endDate?: Dayjs
}

const normalizeText = (value: string) => value.trim()

const toDateString = (value: Dayjs) => value.format('YYYY-MM-DD')

const hasValidCccd = (value: string) => /^(\d{9}|\d{12})$/.test(value.trim())

const formatPeriod = (startDate: string | null, endDate: string | null) => {
  return `${formatResidenceRecordDate(startDate)} - ${formatResidenceRecordDate(endDate)}`
}

const buildEditFormValues = (record: ResidenceRecordRow): TemporaryResidenceEditFormValues => {
  return {
    residentId: record.residentId ?? undefined,
    guestName: record.relatedPersonName || record.guestName || '',
    guestCccd: record.guestCccd || '',
    guestPhone: record.guestPhone || '',
    guestRelationship: displayTemporaryStayGuestRelationship(record),
    reason: displayTemporaryStayReasonOnly(record),
    startDate: record.startDate ? dayjs(record.startDate) : undefined,
    endDate: record.endDate ? dayjs(record.endDate) : undefined,
  }
}

const getRelatedPersonName = (record: Pick<ResidenceRecordRow, 'relatedPersonName' | 'guestName' | 'residentName'>) => {
  return record.relatedPersonName || record.guestName || record.residentName || '—'
}

const isPendingResidenceRecord = (status: string | null | undefined) => {
  return String(status || '').toUpperCase() === 'PENDING'
}

const ResidenceTypeBadge = ({ type }: { type: string }) => (
  <Tag className="temporary-residence-detail__tag temporary-residence-detail__tag--type" color={getResidenceRecordTypeColor(type)}>
    {getResidenceRecordTypeLabel(type)}
  </Tag>
)

const StatusBadge = ({ status }: { status: string }) => (
  <Tag className="temporary-residence-detail__tag temporary-residence-detail__tag--status" color={getResidenceRecordStatusColor(status)}>
    {getResidenceRecordStatusLabel(status)}
  </Tag>
)

const TemporaryStayForm = ({
  householdId,
  residents,
  onCreated,
}: {
  householdId: number | null
  residents: MyHouseholdResident[]
  onCreated: () => Promise<void>
}) => {
  const [form] = Form.useForm<TemporaryStayFormValues>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    form.resetFields()
  }, [form, householdId])

  const disabledStartDate = (current: Dayjs) => {
    const selectedEnd = form.getFieldValue('endDate') as Dayjs | undefined
    if (!selectedEnd) return false
    return current.isAfter(selectedEnd, 'day')
  }

  const disabledEndDate = (current: Dayjs) => {
    const selectedStart = form.getFieldValue('startDate') as Dayjs | undefined
    if (!selectedStart) return false
    return current.isBefore(selectedStart, 'day')
  }

  const resolveResidentId = () => {
    const headResident = residents.find((resident) => (resident.relationship || '').toUpperCase() === 'HEAD')
    return headResident?.id ?? residents[0]?.id ?? null
  }

  const handleFinish = async (values: TemporaryStayFormValues) => {
    if (!householdId) {
      message.error('Không xác định được hộ khẩu. Vui lòng tải lại trang.')
      return
    }

    const residentId = resolveResidentId()
    if (!residentId) {
      message.error('Không tìm thấy cư dân hợp lệ cho hộ này.')
      return
    }

    setSubmitting(true)
    try {
      await createResidenceRecordRequest({
        type: RESIDENCE_RECORD_TYPE.TEMPORARY_STAY,
        householdId,
        residentId,
        guestName: normalizeText(values.guestName),
        guestCccd: normalizeText(values.guestCccd),
        guestPhone: normalizeText(values.guestPhone),
        guestRelationship: normalizeText(values.relationship),
        reason: normalizeText(values.reason),
        startDate: toDateString(values.startDate),
        endDate: toDateString(values.endDate),
      })
      message.success('Đã gửi yêu cầu, chờ duyệt')
      form.resetFields()
      await onCreated()
    } catch (err) {
      message.error(extractApiError(err, 'Không thể gửi yêu cầu tạm trú.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="resident-dashboard__card temporary-residence-form-card" title="Tạo yêu cầu tạm trú">
      <Form layout="vertical" form={form} onFinish={handleFinish} requiredMark={false}>
        <div className="temporary-residence-form-grid">
          <Form.Item
            label="Họ tên"
            name="guestName"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên.' }]}
          >
            <Input placeholder="Nhập họ tên người ngoài" disabled={submitting} />
          </Form.Item>
          <Form.Item
            label="CCCD / CMND"
            name="guestCccd"
            rules={[
              { required: true, message: 'Vui lòng nhập CCCD / CMND.' },
              {
                validator: async (_, value: string) => {
                  if (!value || hasValidCccd(value)) return
                  throw new Error('CCCD / CMND phải gồm 9 hoặc 12 chữ số.')
                },
              },
            ]}
          >
            <Input placeholder="9 hoặc 12 chữ số" maxLength={12} disabled={submitting} />
          </Form.Item>
          <Form.Item
            label="SĐT"
            name="guestPhone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại.' },
              {
                validator: async (_, value: string) => {
                  if (!value || /^0\d{9,10}$/.test(value.trim())) return
                  throw new Error('Số điện thoại không hợp lệ.')
                },
              },
            ]}
          >
            <Input placeholder="Ví dụ: 0912345678" disabled={submitting} />
          </Form.Item>
          <Form.Item
            label="Quan hệ với chủ hộ"
            name="relationship"
            rules={[{ required: true, message: 'Vui lòng nhập quan hệ với chủ hộ.' }]}
          >
            <Input placeholder="Ví dụ: người thân, bạn bè, khách..." disabled={submitting} />
          </Form.Item>
          <Form.Item
            label="Từ ngày"
            name="startDate"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu.' }]}
          >
            <DatePicker format="DD/MM/YYYY" className="temporary-residence-date-picker" disabled={submitting} disabledDate={disabledStartDate} />
          </Form.Item>
          <Form.Item
            label="Đến ngày"
            name="endDate"
            rules={[
              { required: true, message: 'Vui lòng chọn ngày kết thúc.' },
              {
                validator: async (_, value: Dayjs | undefined) => {
                  const selectedStart = form.getFieldValue('startDate') as Dayjs | undefined
                  if (!selectedStart || !value) return
                  if (value.isAfter(selectedStart, 'day')) return
                  throw new Error('Ngày kết thúc phải sau ngày bắt đầu.')
                },
              },
            ]}
          >
            <DatePicker format="DD/MM/YYYY" className="temporary-residence-date-picker" disabled={submitting} disabledDate={disabledEndDate} />
          </Form.Item>
        </div>

        <Form.Item
          label="Lý do"
          name="reason"
          rules={[{ required: true, message: 'Vui lòng nhập lý do.' }]}
        >
          <Input.TextArea rows={4} placeholder="Mô tả ngắn gọn mục đích tạm trú" disabled={submitting} />
        </Form.Item>

        <Space className="temporary-residence-form-actions" wrap>
          <Button htmlType="submit" type="primary" loading={submitting} disabled={!householdId}>
            Gửi yêu cầu
          </Button>
          <Button
            htmlType="button"
            disabled={submitting}
            onClick={() => {
              form.resetFields()
            }}
          >
            Nhập lại
          </Button>
        </Space>
      </Form>
    </Card>
  )
}

const TemporaryAbsenceForm = ({
  residents,
  onCreated,
}: {
  residents: MyHouseholdResident[]
  onCreated: () => Promise<void>
}) => {
  const [form] = Form.useForm<TemporaryAbsenceFormValues>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    form.resetFields()
  }, [form, residents.length])

  const disabledStartDate = (current: Dayjs) => {
    const selectedEnd = form.getFieldValue('endDate') as Dayjs | undefined
    if (!selectedEnd) return false
    return current.isAfter(selectedEnd, 'day')
  }

  const disabledEndDate = (current: Dayjs) => {
    const selectedStart = form.getFieldValue('startDate') as Dayjs | undefined
    if (!selectedStart) return false
    return current.isBefore(selectedStart, 'day')
  }

  const handleFinish = async (values: TemporaryAbsenceFormValues) => {
    setSubmitting(true)
    try {
      await createResidenceRecordRequest({
        type: RESIDENCE_RECORD_TYPE.TEMPORARY_ABSENCE,
        residentId: values.residentId,
        reason: normalizeText(values.reason),
        startDate: toDateString(values.startDate),
        endDate: toDateString(values.endDate),
      })
      message.success('Đã gửi yêu cầu, chờ duyệt')
      form.resetFields()
      await onCreated()
    } catch (err) {
      message.error(extractApiError(err, 'Không thể gửi yêu cầu tạm vắng.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="resident-dashboard__card temporary-residence-form-card" title="Tạo yêu cầu tạm vắng">
      {residents.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thành viên nào trong hộ để tạo yêu cầu tạm vắng." />
      ) : (
        <Form layout="vertical" form={form} onFinish={handleFinish} requiredMark={false}>
          <div className="temporary-residence-form-grid">
            <Form.Item
              label="Người trong hộ"
              name="residentId"
              rules={[{ required: true, message: 'Vui lòng chọn người trong hộ.' }]}
            >
              <Select
                showSearch
                placeholder="Chọn người trong hộ"
                options={residents.map((resident) => ({
                  value: resident.id,
                  label: resident.name,
                }))}
                filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                disabled={submitting}
              />
            </Form.Item>
            <Form.Item
              label="Từ ngày"
              name="startDate"
              rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu.' }]}
            >
              <DatePicker format="DD/MM/YYYY" className="temporary-residence-date-picker" disabled={submitting} disabledDate={disabledStartDate} />
            </Form.Item>
            <Form.Item
              label="Đến ngày"
              name="endDate"
              rules={[
                { required: true, message: 'Vui lòng chọn ngày kết thúc.' },
                {
                  validator: async (_, value: Dayjs | undefined) => {
                    const selectedStart = form.getFieldValue('startDate') as Dayjs | undefined
                    if (!selectedStart || !value) return
                    if (value.isAfter(selectedStart, 'day')) return
                    throw new Error('Ngày kết thúc phải sau ngày bắt đầu.')
                  },
                },
              ]}
            >
              <DatePicker format="DD/MM/YYYY" className="temporary-residence-date-picker" disabled={submitting} disabledDate={disabledEndDate} />
            </Form.Item>
          </div>

          <Form.Item
            label="Lý do"
            name="reason"
            rules={[{ required: true, message: 'Vui lòng nhập lý do.' }]}
          >
            <Input.TextArea rows={4} placeholder="Ví dụ: đi công tác, về quê, chữa bệnh..." disabled={submitting} />
          </Form.Item>

          <Space className="temporary-residence-form-actions" wrap>
            <Button htmlType="submit" type="primary" loading={submitting}>
              Gửi yêu cầu
            </Button>
            <Button
              htmlType="button"
              disabled={submitting}
              onClick={() => {
                form.resetFields()
              }}
            >
              Nhập lại
            </Button>
          </Space>
        </Form>
      )}
    </Card>
  )
}

const TemporaryResidence = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<HouseholdSummary | null>(null)
  const [residents, setResidents] = useState<MyHouseholdResident[]>([])
  const [records, setRecords] = useState<ResidenceRecordRow[]>([])
  const [activeTab, setActiveTab] = useState<ResidenceRecordTypeValue>(RESIDENCE_RECORD_TYPE.TEMPORARY_STAY)
  const [detailRecord, setDetailRecord] = useState<ResidenceRecordRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailEditing, setDetailEditing] = useState(false)
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailForm] = Form.useForm<TemporaryResidenceEditFormValues>()

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [summaryRes, residentsRes, recordsRes] = await Promise.all([
        api.get('/households/me/summary'),
        api.get('/households/me/residents'),
        fetchMyResidenceRecords(),
      ])

      const summaryData = summaryRes.data && typeof summaryRes.data === 'object' ? (summaryRes.data as Record<string, unknown>) : {}
      const toNumber = (value: unknown) => {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }
      const toString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

      setSummary({
        householdId: toNumber(summaryData.householdId) ?? undefined,
        apartmentCode: toString(summaryData.apartmentCode),
        buildingName: toString(summaryData.buildingName),
        floorNumber: toNumber(summaryData.floorNumber),
        area: toNumber(summaryData.area),
        apartmentStatus: toString(summaryData.apartmentStatus),
        memberCount: toNumber(summaryData.memberCount) ?? undefined,
        ownerName: toString(summaryData.ownerName),
      })

      const residentRows = Array.isArray(residentsRes.data) ? residentsRes.data : []
      setResidents(
        residentRows
          .map((item) => item as MyHouseholdResident)
          .filter((item) => item != null && typeof item.id === 'number')
      )

      setRecords(recordsRes)
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải dữ liệu tạm trú / tạm vắng.'))
      setSummary(null)
      setResidents([])
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const visibleApartmentCode = summary?.apartmentCode ?? null

  const visibleRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesApartment = !visibleApartmentCode || record.apartmentCode === visibleApartmentCode
      const matchesType = record.type === activeTab
      return matchesApartment && matchesType
    })
  }, [records, visibleApartmentCode, activeTab])

  const isPendingDetail = isPendingResidenceRecord(detailRecord?.status)

  const editDisabledStartDate = (current: Dayjs) => {
    const selectedEnd = detailForm.getFieldValue('endDate') as Dayjs | undefined
    if (!selectedEnd) return false
    return current.isAfter(selectedEnd, 'day')
  }

  const editDisabledEndDate = (current: Dayjs) => {
    const selectedStart = detailForm.getFieldValue('startDate') as Dayjs | undefined
    if (!selectedStart) return false
    return current.isBefore(selectedStart, 'day')
  }

  const openDetail = (record: ResidenceRecordRow) => {
    setDetailRecord(record)
    setDetailOpen(true)
    setDetailEditing(false)
    detailForm.resetFields()
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailEditing(false)
    setDetailSaving(false)
    setDetailRecord(null)
    detailForm.resetFields()
  }

  const openEditDetail = (record: ResidenceRecordRow) => {
    if (!isPendingResidenceRecord(record.status)) {
      message.warning('Chỉ hồ sơ đang chờ duyệt mới có thể chỉnh sửa.')
      return
    }

    setDetailRecord(record)
    setDetailOpen(true)
    setDetailEditing(true)
    detailForm.setFieldsValue(buildEditFormValues(record))
  }

  const handleCancelRecord = (record: ResidenceRecordRow) => {
    if (!isPendingResidenceRecord(record.status)) {
      message.warning('Chỉ hồ sơ đang chờ duyệt mới có thể huỷ.')
      return
    }

    Modal.confirm({
      title: 'Xác nhận huỷ hồ sơ',
      content: 'Chỉ hồ sơ đang chờ duyệt mới có thể huỷ. Bạn có chắc chắn muốn huỷ hồ sơ này?',
      centered: true,
      className: 'temporary-residence-confirm-modal',
      okText: 'Huỷ hồ sơ',
      cancelText: 'Đóng',
      okButtonProps: { danger: true, className: 'temporary-residence-confirm-modal__btn' },
      cancelButtonProps: { className: 'temporary-residence-confirm-modal__btn' },
      onOk: async () => {
        await cancelResidenceRecordRequest(record.id)
        message.success('Đã huỷ hồ sơ thành công')
        await refreshAfterSubmit()
        closeDetail()
      },
    })
  }

  const handleSaveDetail = async () => {
    if (!detailRecord || !isPendingDetail) {
      return
    }

    setDetailSaving(true)
    try {
      const values = await detailForm.validateFields()
      const isStay = String(detailRecord.type).toUpperCase() === RESIDENCE_RECORD_TYPE.TEMPORARY_STAY
      const payload: ResidenceRecordCreatePayload = {
        type: String(detailRecord.type).toUpperCase() as ResidenceRecordCreatePayload['type'],
        householdId: summary?.householdId ?? undefined,
        residentId: isStay ? detailRecord.residentId ?? undefined : values.residentId,
        guestName: isStay ? normalizeText(String(values.guestName || '')) : undefined,
        guestCccd: isStay ? normalizeText(String(values.guestCccd || '')) : undefined,
        guestPhone: isStay ? normalizeText(String(values.guestPhone || '')) : undefined,
        guestRelationship: isStay ? normalizeText(String(values.guestRelationship || '')) : undefined,
        reason: normalizeText(String(values.reason || '')),
        startDate: values.startDate ? toDateString(values.startDate) : (detailRecord.startDate ?? ''),
        endDate: values.endDate ? toDateString(values.endDate) : detailRecord.endDate,
      }

      await updateResidenceRecordRequest(detailRecord.id, payload)
      message.success('Cập nhật hồ sơ thành công')
      await refreshAfterSubmit()
      closeDetail()
    } catch (err) {
      message.error(extractApiError(err, 'Không thể cập nhật hồ sơ.'))
    } finally {
      setDetailSaving(false)
    }
  }

  const actionsColumn = useMemo(
    (): ColumnsType<ResidenceRecordRow>[number] => ({
      title: 'Thao tác',
      key: 'actions',
      width: 170,
      render: (_, record) => {
        const canCancel = isPendingResidenceRecord(record.status)
        return (
          <Space className="temporary-residence-actions" size={8} wrap={false}>
            <Button size="small" onClick={() => openDetail(record)}>
              Xem chi tiết
            </Button>
            <Tooltip title={canCancel ? 'Huỷ hồ sơ đang chờ duyệt' : 'Chỉ có thể huỷ khi chờ duyệt'}>
              <Button size="small" danger disabled={!canCancel} onClick={() => handleCancelRecord(record)}>
                Huỷ
              </Button>
            </Tooltip>
          </Space>
        )
      },
    }),
    [openDetail, handleCancelRecord]
  )

  const residentColumnsForStay = useMemo((): ColumnsType<ResidenceRecordRow> => {
    const relatedCol: ColumnsType<ResidenceRecordRow>[number] = {
      title: 'Người được đăng ký',
      key: 'relatedPerson',
      ellipsis: true,
      width: 170,
      render: (_, record) => <Text>{getRelatedPersonName(record)}</Text>,
    }
    const apartmentCol: ColumnsType<ResidenceRecordRow>[number] = {
      title: 'Mã căn hộ',
      key: 'apartmentCode',
      width: 110,
      render: (_, record) => <Text>{record.apartmentCode || '—'}</Text>,
    }
    const relationshipCol: ColumnsType<ResidenceRecordRow>[number] = {
      title: 'Quan hệ với chủ hộ',
      key: 'stayRelationship',
      ellipsis: true,
      width: 150,
      render: (_, record) => <Text>{displayTemporaryStayGuestRelationship(record)}</Text>,
    }
    const reasonCol: ColumnsType<ResidenceRecordRow>[number] = {
      title: 'Lý do',
      key: 'stayReason',
      ellipsis: true,
      width: 220,
      render: (_, record) => (
        <Tooltip title={displayTemporaryStayReasonOnly(record)} placement="topLeft">
          <Text>{displayTemporaryStayReasonOnly(record)}</Text>
        </Tooltip>
      ),
    }
    const statusCol: ColumnsType<ResidenceRecordRow>[number] = {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      render: (_, record) => <StatusBadge status={record.status} />,
    }
    return [relatedCol, apartmentCol, relationshipCol, reasonCol, statusCol, actionsColumn]
  }, [actionsColumn])

  const residentColumnsForAbsence = useMemo((): ColumnsType<ResidenceRecordRow> => {
    const relatedCol: ColumnsType<ResidenceRecordRow>[number] = {
      title: 'Người được đăng ký',
      key: 'relatedPerson',
      ellipsis: true,
      width: 180,
      render: (_, record) => <Text>{getRelatedPersonName(record)}</Text>,
    }
    const timeCol: ColumnsType<ResidenceRecordRow>[number] = {
      title: 'Thời gian',
      key: 'time',
      width: 170,
      render: (_, record) => <span>{formatPeriod(record.startDate, record.endDate)}</span>,
    }
    const statusCol: ColumnsType<ResidenceRecordRow>[number] = {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      render: (_, record) => <StatusBadge status={record.status} />,
    }
    return [relatedCol, timeCol, statusCol, actionsColumn]
  }, [actionsColumn])

  const refreshAfterSubmit = async () => {
    await loadData()
  }

  const tabItems = [
    {
      key: RESIDENCE_RECORD_TYPE.TEMPORARY_STAY,
      label: 'Tạm trú',
      children: (
        <div className="temporary-residence-tab">
          <TemporaryStayForm householdId={summary?.householdId ?? null} residents={residents} onCreated={refreshAfterSubmit} />
          <Card className="resident-dashboard__card temporary-residence-list-card" title="Danh sách tạm trú">
            {visibleRecords.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đăng ký nào" />
            ) : (
              <Table
                rowKey={(record) => String(record.id)}
                columns={residentColumnsForStay}
                dataSource={visibleRecords}
                pagination={false}
                className="temporary-residence-table"
              />
            )}
          </Card>
        </div>
      ),
    },
    {
      key: RESIDENCE_RECORD_TYPE.TEMPORARY_ABSENCE,
      label: 'Tạm vắng',
      children: (
        <div className="temporary-residence-tab">
          <TemporaryAbsenceForm residents={residents} onCreated={refreshAfterSubmit} />
          <Card className="resident-dashboard__card temporary-residence-list-card" title="Danh sách tạm vắng">
            {visibleRecords.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đăng ký nào" />
            ) : (
              <Table
                rowKey={(record) => String(record.id)}
                columns={residentColumnsForAbsence}
                dataSource={visibleRecords}
                pagination={false}
                className="temporary-residence-table"
              />
            )}
          </Card>
        </div>
      ),
    },
  ]

  return (
    <div className="resident-page profile-household-page temporary-residence-page">
      <header className="ph-page-intro">
        <h1 className="ph-page-intro__title">Tạm trú & Tạm vắng</h1>
        <p className="ph-page-intro__sub">Yêu cầu trạng thái tạm trú / tạm vắng</p>
      </header>

      {error && <Alert type="warning" showIcon message={error} className="profile-household__alert" />}

      <div className="ph-page-stack">
        <Card className="resident-dashboard__card resident-settings-card temporary-residence-shell">
          {loading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <>
              <div className="temporary-residence-apartment" style={{ marginBottom: 16 }}>
                <span className="ph-overview-code-pill" aria-label="Mã căn hộ">
                  {summary?.apartmentCode || 'Chưa xác định'}
                </span>
              </div>
              <Tabs
                className="resident-settings-tabs temporary-residence-tabs"
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as ResidenceRecordTypeValue)}
                items={tabItems}
                destroyInactiveTabPane
              />
            </>
          )}
        </Card>
      </div>

      <Modal
        open={detailOpen && detailRecord != null}
        onCancel={closeDetail}
        title="Chi tiết hồ sơ"
        width={760}
        className="temporary-residence-detail-modal"
        destroyOnClose
        footer={
          detailRecord
            ? isPendingDetail
              ? detailEditing
                ? [
                  <Button key="edit-cancel" className="temporary-residence-detail__footer-btn" onClick={() => { setDetailEditing(false); detailForm.resetFields(); }}>
                    Hủy chỉnh sửa
                  </Button>,
                  <Button key="edit-save" className="temporary-residence-detail__footer-btn" type="primary" loading={detailSaving} onClick={handleSaveDetail}>
                    Lưu thay đổi
                  </Button>,
                ]
                : [
                  <Button key="edit-open" className="temporary-residence-detail__footer-btn" disabled={!isPendingDetail} onClick={() => openEditDetail(detailRecord)}>
                    Chỉnh sửa
                  </Button>,
                  <Button key="cancel-record" className="temporary-residence-detail__footer-btn" danger disabled={!isPendingDetail} onClick={() => handleCancelRecord(detailRecord)}>
                    Huỷ
                  </Button>,
                  <Button key="close-record" className="temporary-residence-detail__footer-btn" onClick={closeDetail}>
                    Đóng
                  </Button>,
                ]
              : [
                <Button key="close-record" className="temporary-residence-detail__footer-btn" onClick={closeDetail}>
                  Đóng
                </Button>,
              ]
            : null
        }
      >
        {detailRecord && !detailEditing && (
          <div className="temporary-residence-detail">
            <div className="temporary-residence-detail__meta-grid">
              <div className="temporary-residence-detail__row">
                <Text type="secondary">Loại</Text>
                <ResidenceTypeBadge type={detailRecord.type} />
              </div>
              <div className="temporary-residence-detail__row">
                <Text type="secondary">Trạng thái</Text>
                <StatusBadge status={detailRecord.status} />
              </div>

              <div className="temporary-residence-detail__row">
                <Text type="secondary">Người được đăng ký</Text>
                <Text strong>{getRelatedPersonName(detailRecord)}</Text>
              </div>
              <div className="temporary-residence-detail__row">
                <Text type="secondary">Thời gian</Text>
                <Text>{formatPeriod(detailRecord.startDate, detailRecord.endDate)}</Text>
              </div>
              <div className="temporary-residence-detail__row">
                <Text type="secondary">Căn hộ</Text>
                <Text>{detailRecord.apartmentCode || '—'}</Text>
              </div>
              {detailRecord.type === RESIDENCE_RECORD_TYPE.TEMPORARY_STAY && (
                <div className="temporary-residence-detail__row">
                  <Text type="secondary">Quan hệ với chủ hộ</Text>
                  <Text>{displayTemporaryStayGuestRelationship(detailRecord)}</Text>
                </div>
              )}
            </div>
            <div className="temporary-residence-detail__row temporary-residence-detail__row--wide">
              <Text type="secondary">Lý do</Text>
              <Paragraph className="temporary-residence-detail__reason">{displayTemporaryStayReasonOnly(detailRecord)}</Paragraph>
            </div>
          </div>
        )}

        {detailRecord && detailEditing && isPendingDetail && (
          <Form
            layout="vertical"
            form={detailForm}
            className="temporary-residence-detail-form"
            initialValues={buildEditFormValues(detailRecord)}
          >
            <div className="temporary-residence-form-grid">
              {detailRecord.type === RESIDENCE_RECORD_TYPE.TEMPORARY_ABSENCE ? (
                <Form.Item
                  label="Người trong hộ"
                  name="residentId"
                  rules={[{ required: true, message: 'Vui lòng chọn người trong hộ.' }]}
                >
                  <Select
                    showSearch
                    placeholder="Chọn người trong hộ"
                    options={residents.map((resident) => ({
                      value: resident.id,
                      label: resident.name,
                    }))}
                    filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                    disabled={detailSaving}
                  />
                </Form.Item>
              ) : (
                <>
                  <Form.Item
                    label="Họ tên"
                    name="guestName"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên.' }]}
                  >
                    <Input placeholder="Nhập họ tên người ngoài" disabled={detailSaving} />
                  </Form.Item>
                  <Form.Item
                    label="CCCD / CMND"
                    name="guestCccd"
                    rules={[{ required: true, message: 'Vui lòng nhập CCCD / CMND.' }]}
                  >
                    <Input placeholder="9 hoặc 12 chữ số" maxLength={12} disabled={detailSaving} />
                  </Form.Item>
                  <Form.Item
                    label="SĐT"
                    name="guestPhone"
                    rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }]}
                  >
                    <Input placeholder="Ví dụ: 0912345678" disabled={detailSaving} />
                  </Form.Item>
                  <Form.Item
                    label="Quan hệ với chủ hộ"
                    name="guestRelationship"
                    rules={[{ required: true, message: 'Vui lòng nhập quan hệ với chủ hộ.' }]}
                  >
                    <Input placeholder="Ví dụ: người thân, bạn bè, khách..." disabled={detailSaving} />
                  </Form.Item>
                </>
              )}
              <Form.Item
                label="Từ ngày"
                name="startDate"
                rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu.' }]}
              >
                <DatePicker format="DD/MM/YYYY" className="temporary-residence-date-picker" disabled={detailSaving} disabledDate={editDisabledStartDate} />
              </Form.Item>
              <Form.Item
                label="Đến ngày"
                name="endDate"
                rules={[
                  { required: true, message: 'Vui lòng chọn ngày kết thúc.' },
                  {
                    validator: async (_, value: Dayjs | undefined) => {
                      const selectedStart = detailForm.getFieldValue('startDate') as Dayjs | undefined
                      if (!selectedStart || !value) return
                      if (value.isAfter(selectedStart, 'day')) return
                      throw new Error('Ngày kết thúc phải sau ngày bắt đầu.')
                    },
                  },
                ]}
              >
                <DatePicker format="DD/MM/YYYY" className="temporary-residence-date-picker" disabled={detailSaving} disabledDate={editDisabledEndDate} />
              </Form.Item>
            </div>

            <Form.Item
              label="Lý do"
              name="reason"
              rules={[{ required: true, message: 'Vui lòng nhập lý do.' }]}
            >
              <Input.TextArea rows={4} placeholder="Mô tả ngắn gọn mục đích tạm trú / tạm vắng" disabled={detailSaving} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default TemporaryResidence
