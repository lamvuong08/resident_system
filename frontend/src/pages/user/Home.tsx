import { useEffect, useState } from 'react'
import { Card, Col, Row, Typography } from 'antd'
import api, { extractApiError } from '../../utils/api'

const { Title, Text } = Typography

type HouseholdSummary = {
  householdId: number
  apartmentCode: string | null
  memberCount: number
  ownerName: string | null
}

type HouseholdResident = {
  id: number
  name: string
  relationship: string | null
  gender: string | null
  cccd: string | null
  phone: string | null
}

export default function Home() {
  const [summary, setSummary] = useState<HouseholdSummary | null>(null)
  const [residents, setResidents] = useState<HouseholdResident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [summaryRes, residentsRes] = await Promise.all([
          api.get('/households/me/summary'),
          api.get('/households/me/residents'),
        ])

        if (!mounted) {
          return
        }

        setSummary(summaryRes.data ?? null)
        setResidents(Array.isArray(residentsRes.data) ? residentsRes.data : [])
      } catch (err: any) {
        if (!mounted) {
          return
        }
        if (err?.response?.status === 404) {
          setError('Tài khoản chưa được gán vào hộ khẩu nào.')
        } else {
          setError(extractApiError(err, 'Không thể tải dữ liệu hộ khẩu'))
        }
        setSummary(null)
        setResidents([])
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [])

  const genderLabel = (gender: string | null) => {
    if (gender === 'MALE') return 'Nam'
    if (gender === 'FEMALE') return 'Nữ'
    return 'Khác'
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginTop: 0 }}>Thông tin hộ khẩu của tôi</Title>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card loading={loading} style={{ borderRadius: 12 }}>
            <Text type="secondary">Mã căn hộ</Text>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{summary?.apartmentCode || '—'}</div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading} style={{ borderRadius: 12 }}>
            <Text type="secondary">Số thành viên</Text>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{summary?.memberCount ?? 0}</div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading} style={{ borderRadius: 12 }}>
            <Text type="secondary">Chủ hộ</Text>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{summary?.ownerName || '—'}</div>
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách thành viên" style={{ borderRadius: 12, marginTop: 16 }} loading={loading}>
        {error ? (
          <Text type="danger">{error}</Text>
        ) : residents.length === 0 ? (
          <Text type="secondary">Chưa có dữ liệu cư dân.</Text>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {residents.map((resident) => (
              <div
                key={resident.id}
                style={{
                  border: '1px solid #eef2f7',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 600 }}>{resident.name}</div>
                  <Text type="secondary">{resident.relationship || 'THANH_VIEN'}</Text>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Text>Giới tính: {genderLabel(resident.gender)}</Text>
                  <Text>CCCD: {resident.cccd || '—'}</Text>
                  <Text>SĐT: {resident.phone || '—'}</Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
