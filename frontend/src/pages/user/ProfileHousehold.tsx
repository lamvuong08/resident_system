import { useEffect, useState } from 'react'
import { Alert, Card, Empty, List, Skeleton, Tag } from 'antd'
import api, { extractApiError } from '../../utils/api'
import { formatResidentGender, formatResidentRelationship } from '../../utils/resident'
import type { HouseholdSummary } from '../../types/residentDashboard'
import '../../styles/resident-dashboard.css'

type HouseholdResident = {
  id: number
  name: string
  relationship: string | null
  gender: string | null
  cccd: string | null
  phone: string | null
}

const ProfileHousehold = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<HouseholdSummary | null>(null)
  const [residents, setResidents] = useState<HouseholdResident[]>([])

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

        if (!mounted) return

        setSummary((summaryRes.data || null) as HouseholdSummary | null)
        setResidents(Array.isArray(residentsRes.data) ? residentsRes.data : [])
      } catch (err) {
        if (!mounted) return
        setError(extractApiError(err, 'Không thể tải hồ sơ hộ khẩu.'))
        setSummary(null)
        setResidents([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="resident-page">
      <h2>Hồ sơ & Hộ khẩu</h2>

      {error && <Alert type="warning" showIcon message={error} />}

      <Card className="resident-dashboard__card" title="Tóm tắt hộ khẩu">
        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <div className="resident-grid resident-grid--two">
            <div>
              <span>Mã căn hộ</span>
              <strong>{summary?.apartmentCode || 'Chưa có dữ liệu'}</strong>
            </div>
            <div>
              <span>Chủ hộ</span>
              <strong>{summary?.ownerName || 'Chưa có dữ liệu'}</strong>
            </div>
            <div>
              <span>Số thành viên</span>
              <strong>{summary?.memberCount ?? 0}</strong>
            </div>
            <div>
              <span>Trạng thái</span>
              <Tag color="green">Đang hoạt động</Tag>
            </div>
          </div>
        )}
      </Card>

      <Card className="resident-dashboard__card" title="Danh sách thành viên">
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : residents.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thành viên trong hộ khẩu." />
        ) : (
          <List
            dataSource={residents}
            renderItem={(resident) => (
              <List.Item className="resident-list-item">
                <div>
                  <strong>{resident.name}</strong>
                  <p>{formatResidentRelationship(resident.relationship)}</p>
                </div>
                <div className="resident-list-item__right">
                  <span>{formatResidentGender(resident.gender)}</span>
                  <span>{resident.phone || 'Không có SĐT'}</span>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}

export default ProfileHousehold
