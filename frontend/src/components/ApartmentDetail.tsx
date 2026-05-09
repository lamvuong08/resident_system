import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Apartment, Resident } from '../types/api'
import { Row, Col, Card, Typography, Button, Tag, Space, Modal, message, Empty } from 'antd'
import { DownloadOutlined, UserAddOutlined } from '@ant-design/icons'
import { jsPDF } from 'jspdf'
import ResidentTable from './ResidentTable'
import ResidentModal from './ResidentModal'
import FinancePanel from './FinancePanel'
import api, { extractApiError } from '../utils/api'
import { formatDateVN, formatResidentGender, formatResidentRelationship, normalizeResident } from '../utils/resident'

const { Title } = Typography

const statusLabel = (status?: string | null) => {
  if (!status) return '-'
  if (status === 'OCCUPIED') return 'Đã ở'
  if (status === 'EMPTY' || status === 'VACANT') return 'Trống'
  if (status === 'MAINTENANCE') return 'Bảo trì'
  return status
}

const statusColor = (status?: string | null) => {
  if (status === 'OCCUPIED') return 'green'
  if (status === 'EMPTY' || status === 'VACANT') return 'default'
  if (status === 'MAINTENANCE') return 'gold'
  return 'blue'
}

const normalizeApartment = (apartment: Partial<Apartment> | null) => {
  if (!apartment || typeof apartment !== 'object') return null
  const a = apartment as Record<string, unknown>

  const building = (a.building as Record<string, unknown> | undefined) ?? undefined

  return {
    ...apartment,
    code: (apartment as Partial<Apartment>).code ?? (a.apartmentCode as string | undefined) ?? null,
    floorNumber: (apartment as Partial<Apartment>).floorNumber ?? (a.floor as number | undefined) ?? null,
    area: apartment.area ?? null,
    status: apartment.status ?? null,
    ownerName: apartment.ownerName ?? (a.owner as string | undefined) ?? null,
    peopleCount: apartment.peopleCount ?? (a.people as number | undefined) ?? 0,
    buildingName: apartment.buildingName ?? ((building?.name as string | undefined) ?? (building?.code as string | undefined)) ?? null,
    householdId: apartment.householdId ?? null,
  }
}

const normalizeGenderForApi = (gender?: string | null) => {
  const value = (gender || '').toUpperCase().trim()
  if (value === 'M') return 'MALE'
  if (value === 'F') return 'FEMALE'
  if (value === 'MALE' || value === 'FEMALE' || value === 'OTHER') return value
  return null
}

const normalizeRelationshipForApi = (relationship?: string | null) => {
  const value = (relationship || '').toUpperCase().trim()
  if (value === 'CHU_HO') return 'HEAD'
  if (value === 'VO_CHONG') return 'SPOUSE'
  if (value === 'CON') return 'CHILD'
  if (value === 'CHA_ME') return 'PARENT'
  if (value === 'NGUOI_THAN') return 'OTHER'
  if (value === 'HEAD' || value === 'SPOUSE' || value === 'CHILD' || value === 'PARENT' || value === 'OTHER') return value
  return 'OTHER'
}

const sanitizeOptionalText = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') return null
  return trimmed
}

const containsAny = (value: string, keywords: string[]) => keywords.some((keyword) => value.includes(keyword))

const toFriendlyResidentMessage = (
  error: unknown,
  options?: { fallback?: string; genericInvalid?: string }
) => {
  const fallback = options?.fallback || 'Có lỗi xảy ra, vui lòng thử lại.'
  const genericInvalid = options?.genericInvalid || 'Không thể thêm cư dân. Vui lòng kiểm tra lại thông tin.'
  const e = error as { response?: { status?: unknown } }
  const status = Number(e?.response?.status || 0)
  const rawMessage = String(extractApiError(error, '') || '')
  const normalized = rawMessage.toLowerCase()

  const isDuplicateLike =
    status === 409 ||
    containsAny(normalized, ['duplicate', 'already exists', 'unique constraint', 'constraint'])

  if (containsAny(normalized, ['cccd', 'citizen id', 'can cuoc']) && isDuplicateLike) {
    return 'CCCD đã tồn tại trong hệ thống.'
  }

  if (containsAny(normalized, ['phone', 'dien thoai', 'so dien thoai']) && isDuplicateLike) {
    return 'Số điện thoại đã được sử dụng.'
  }

  if (status === 400 || status === 422) {
    return genericInvalid
  }

  if (status >= 500) {
    return 'Có lỗi xảy ra, vui lòng thử lại.'
  }

  return fallback
}

const toFriendlyActionMessage = (error: unknown, fallback: string) => {
  const e = error as { response?: { status?: unknown } }
  const status = Number(e?.response?.status || 0)
  if (status === 400 || status === 422) {
    return 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại thông tin.'
  }
  if (status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }
  if (status === 404) {
    return 'Không tìm thấy dữ liệu cần thao tác. Vui lòng tải lại trang.'
  }
  if (status >= 500) {
    return 'Có lỗi xảy ra, vui lòng thử lại.'
  }
  return fallback
}

const ApartmentDetail: React.FC<{ apartment?: Partial<Apartment> | null; onApartmentReload?: () => void }> = ({ apartment, onApartmentReload }) => {
  const normalizedApartment = useMemo(() => normalizeApartment(apartment ?? null), [apartment])
  const [residents, setResidents] = useState<Resident[]>([])
  const [loadingResidents, setLoadingResidents] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Resident | null>(null)
  const [savingResident, setSavingResident] = useState(false)
  const [householdId, setHouseholdId] = useState<number | null>(normalizedApartment?.householdId ?? null)

  useEffect(() => {
    setHouseholdId(normalizedApartment?.householdId ?? null)
  }, [normalizedApartment?.householdId])

  const loadResidents = useCallback(async () => {
    if (!normalizedApartment?.code) {
      setResidents([])
      return
    }

    setLoadingResidents(true)
    try {
      const response = await api.get(`/apartments/${normalizedApartment.code}/residents`)
      const payload = Array.isArray(response.data) ? response.data : []
      setResidents(payload.map((resident: unknown) => normalizeResident(resident as Resident)) as Resident[])
    } catch {
      message.error('Không thể tải danh sách cư dân. Vui lòng thử lại.')
      setResidents([])
    } finally {
      setLoadingResidents(false)
    }
  }, [normalizedApartment?.code])

  useEffect(() => {
    void loadResidents()
  }, [loadResidents])

  const ensureHouseholdId = async () => {
    if (householdId) return householdId
    if (!normalizedApartment?.code) return null

    const response = await api.post(`/apartments/${normalizedApartment.code}/household`)
    const resolvedHouseholdId = response.data?.householdId ?? null
    setHouseholdId(resolvedHouseholdId)
    return resolvedHouseholdId
  }

  const handleAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const handleEdit = (resident: Resident) => {
    setEditing(resident)
    setModalVisible(true)
  }

  const handleDelete = async (id: string | number) => {
    Modal.confirm({
      title: 'Xóa cư dân',
      content: 'Bạn có chắc chắn muốn xóa cư dân này khỏi hộ khẩu không?',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.delete(`/residents/${id}`)
          message.success('Đã xóa cư dân.')
          await loadResidents()
          await onApartmentReload?.()
        } catch (error: unknown) {
          message.error(toFriendlyActionMessage(error, 'Không thể xóa cư dân. Vui lòng thử lại.'))
          throw error
        }
      },
    })
  }

  const handleSave = async (values: Partial<Resident>) => {
    if (!normalizedApartment?.code) {
      message.error('Thiếu mã căn hộ')
      return
    }

    setSavingResident(true)
    try {
      const resolvedHouseholdId = await ensureHouseholdId()
      if (!resolvedHouseholdId) {
        message.error('Không thể tạo household cho căn hộ này')
        return
      }

      const payload = {
        name: values.name,
        gender: normalizeGenderForApi(values.gender),
        dob: values.dob || null,
        cccd: sanitizeOptionalText(values.cccd),
        phone: sanitizeOptionalText(values.phone),
        relationship: normalizeRelationshipForApi(values.relationship),
        householdId: resolvedHouseholdId,
      }

      if (editing?.id) {
        await api.put(`/residents/${editing.id}`, payload)
        message.success('Cập nhật cư dân thành công.')
      } else {
        await api.post('/residents', payload)
        message.success('Thêm thành viên thành công.')
      }

      setModalVisible(false)
      setEditing(null)
      await loadResidents()
      await onApartmentReload?.()
    } catch (error: unknown) {
      message.error(
        toFriendlyResidentMessage(error, {
          fallback: 'Có lỗi xảy ra, vui lòng thử lại.',
          genericInvalid: 'Không thể thêm cư dân. Vui lòng kiểm tra lại thông tin.',
        })
      )
    } finally {
      setSavingResident(false)
    }
  }

  const handleExportPdf = () => {
    if (!normalizedApartment?.code) {
      message.error('Thiếu dữ liệu căn hộ để xuất PDF')
      return
    }

    const doc = new jsPDF()
    let cursorY = 16

    doc.setFontSize(16)
    doc.text('Thông tin căn hộ', 14, cursorY)
    cursorY += 10

    doc.setFontSize(11)
    const apartmentLines = [
      `Mã căn hộ: ${normalizedApartment.code || '-'}`,
      `Tòa nhà: ${normalizedApartment.buildingName || '-'}`,
      `Tầng: ${normalizedApartment.floorNumber ?? '-'}`,
      `Diện tích: ${normalizedApartment.area ?? '-'} m²`,
      `Trạng thái: ${statusLabel(normalizedApartment.status)}`,
      `Chủ hộ: ${normalizedApartment.ownerName || '-'}`,
      `Số người ở: ${normalizedApartment.peopleCount ?? 0}`,
    ]

    apartmentLines.forEach((line) => {
      doc.text(line, 14, cursorY)
      cursorY += 7
    })

    cursorY += 4
    doc.setFontSize(14)
    doc.text('Danh sách cư dân', 14, cursorY)
    cursorY += 8
    doc.setFontSize(10)

    if (residents.length === 0) {
      doc.text('Chưa có cư dân.', 14, cursorY)
    } else {
      residents.forEach((resident, index) => {
        const row = `${index + 1}. ${resident.name || '-'} | ${formatResidentGender(resident.gender)} | ${formatDateVN(resident.dob)} | ${resident.cccd || '-'} | ${resident.phone || '-'} | ${formatResidentRelationship(resident.relationship)}`
        const lines = doc.splitTextToSize(row, 180)

        if (cursorY > 270) {
          doc.addPage()
          cursorY = 16
        }

        doc.text(lines, 14, cursorY)
        cursorY += lines.length * 6 + 1
      })
    }

    doc.save(`can-ho-${normalizedApartment.code}.pdf`)
  }

  if (!normalizedApartment) {
    return (
      <Card style={{ borderRadius: 12 }}>
        <Empty description="Chưa có dữ liệu căn hộ" />
      </Card>
    )
  }

  return (
    <div>
      <Row gutter={16}>
        <Col span={24}>
          <Card style={{ borderRadius: 12, marginBottom: 16, textAlign: 'left' }}>
            <Title level={4} style={{ textAlign: 'left', marginBottom: 16 }}>Thông tin căn hộ</Title>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, textAlign: 'left' }}>
              <div>Mã căn hộ: <strong>{normalizedApartment.code ?? '-'}</strong></div>
              <div>Tòa nhà: <strong>{normalizedApartment.buildingName || '-'}</strong></div>
              <div>Tầng: <strong>{normalizedApartment.floorNumber ?? '-'}</strong></div>
              <div>Diện tích: <strong>{normalizedApartment.area ?? '-'} m²</strong></div>
              <div>Trạng thái: <Tag color={statusColor(normalizedApartment.status)}>{statusLabel(normalizedApartment.status)}</Tag></div>
              <div>Chủ hộ: <strong>{normalizedApartment.ownerName ?? '-'}</strong></div>
              <div>Số người ở: <strong>{loadingResidents ? (normalizedApartment.peopleCount ?? 0) : residents.length}</strong></div>
            </div>
          </Card>

          <Card style={{ borderRadius: 12, marginBottom: 16, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div>
                <Title level={5} style={{ textAlign: 'left', margin: 0 }}>Thông tin cư dân</Title>
                <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 4 }}>Danh sách cư dân trong căn hộ</div>
              </div>
              <div className="apartment-actions">
                <Space wrap>
                  <Button className="apt-action-btn" type="primary" icon={<UserAddOutlined />} onClick={handleAdd}>
                    Thêm cư dân
                  </Button>
                  <Button className="apt-action-btn" icon={<DownloadOutlined />} onClick={handleExportPdf}>
                    Xuất PDF
                  </Button>
                </Space>
              </div>
            </div>
            <ResidentTable
              data={residents}
              loading={loadingResidents}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Card>

          <FinancePanel />
        </Col>
      </Row>

      <ResidentModal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSave={handleSave}
        initial={editing}
        householdId={householdId}
        loading={savingResident}
      />
    </div>
  )
}

export default ApartmentDetail