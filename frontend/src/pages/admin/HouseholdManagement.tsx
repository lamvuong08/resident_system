import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Row, Col, Card, Button, Typography, message } from 'antd'
import ResidentTable from '../../components/ResidentTable'
import ResidentModal from '../../components/ResidentModal'
import api from '../../utils/api'
import { normalizeResident } from '../../utils/resident'
import type { Resident } from '../../types/api'
import '../../styles/dashboard.css'

const { Title, Text } = Typography

type ResidentId = string | number

const getNormalizedResidentList = (payload: unknown): Resident[] => {
  if (!Array.isArray(payload)) {
    return []
  }
  return payload.map((resident: unknown) => normalizeResident(resident as Resident))
}

const HouseholdManagement: React.FC = () => {
  const loc = useLocation()
  const state = (loc.state as { aptCode?: string } | null) ?? {}
  const params = new URLSearchParams(loc.search || '')
  const apartment = state.aptCode || params.get('apt') || null

  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Resident | null>(null)
  const [householdId, setHouseholdId] = useState<number | null>(null)

  const loadResidents = async (apartmentCode: string) => {
    setLoading(true)
    try {
      const response = await api.get(`/apartments/${apartmentCode}/residents`)
      setResidents(getNormalizedResidentList(response.data))
    } catch {
      setResidents([])
    } finally {
      setLoading(false)
    }
  }

  const resolveHousehold = async (apartmentCode: string) => {
    try {
      const response = await api.post(`/apartments/${apartmentCode}/household`)
      setHouseholdId(response.data?.householdId ?? null)
    } catch {
      setHouseholdId(null)
    }
  }

  useEffect(() => {
    if (!apartment) {
      setResidents([])
      setHouseholdId(null)
      return
    }

    void loadResidents(apartment)
    void resolveHousehold(apartment)
  }, [apartment])

  const handleAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const handleEdit = (resident: Resident) => {
    setEditing(resident)
    setModalVisible(true)
  }

  const handleDelete = async (residentId: ResidentId) => {
    await api.delete(`/residents/${residentId}`)
    setResidents((prev) => prev.filter((resident) => String(resident.id) !== String(residentId)))
  }

  const handleMakeOwner = async (residentId: ResidentId) => {
    const resident = residents.find((item) => String(item.id) === String(residentId))
    if (!resident) return

    try {
      await api.put(`/residents/${residentId}`, { ...resident, relationship: 'HEAD' })
      setResidents((prev) =>
        prev.map((item) =>
          String(item.id) === String(residentId)
            ? { ...item, relationship: 'HEAD', relationshipLabel: 'Chủ hộ' }
            : item
        )
      )
      message.success('Đã cập nhật chủ hộ')
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } }
      if (e?.response?.status === 403) {
        message.error('Bạn không có quyền thực hiện hành động này (403)')
      } else {
        message.error('Không thể cập nhật chủ hộ. Vui lòng thử lại sau.')
      }
    }
  }
  const handleSave = async (values: Partial<Resident>) => {
    const payload = {
      name: values.name,
      gender: values.gender,
      dob: values.dob || null,
      cccd: values.cccd || null,
      phone: values.phone || null,
      relationship: values.relationship,
      householdId: householdId ?? values.householdId ?? null,
    }

    if (editing?.id) {
      await api.put(`/residents/${editing.id}`, payload)
      setResidents((prev) =>
        prev.map((resident) =>
          String(resident.id) === String(editing.id)
            ? normalizeResident({ ...resident, ...payload })
            : resident
        )
      )
    } else {
      const created = await api.post('/residents', payload)
      setResidents((prev) => [normalizeResident(created.data), ...prev])
    }

    setModalVisible(false)
  }

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Text type="secondary">Tổng số thành viên: {residents.length}</Text>
        </Col>
        <Col>
          <Button type="primary" onClick={handleAdd}>Thêm cư dân</Button>
          <Button style={{ marginLeft: 8 }}>Chỉnh sửa hộ khẩu</Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 12 }}>
        <Col span={16}>
          <Card style={{ borderRadius: 12 }}>
            <ResidentTable data={residents} loading={loading} onView={() => {}} onEdit={handleEdit} onDelete={handleDelete} onMakeOwner={handleMakeOwner} />
          </Card>
        </Col>

        <Col span={8}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Card style={{ borderRadius: 12 }}>
              <Title level={5}>Thống kê</Title>
              <div>Tổng: {residents.length}</div>
              <div>Nam: {residents.filter(r => r.gender === 'MALE' || r.gender === 'M').length}</div>
              <div>Nữ: {residents.filter(r => r.gender === 'FEMALE' || r.gender === 'F').length}</div>
              <div>Trẻ em: {residents.filter(r => (r.birthYear || 0) > 2008).length}</div>
            </Card>

            <Card style={{ borderRadius: 12 }}>
              <Title level={5}>Hồ sơ</Title>
              <div>CCCD đã xác minh: 2</div>
              <div>Tạm trú: 0</div>
              <div>Hợp đồng thuê: 1</div>
            </Card>
          </div>
        </Col>
      </Row>

      <ResidentModal visible={modalVisible} onCancel={() => setModalVisible(false)} onSave={handleSave} initial={editing} householdId={householdId} />
    </div>
  )
}

export default HouseholdManagement
