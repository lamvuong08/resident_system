import { useEffect, useState } from 'react'
import { Alert, Card, Empty, List, Skeleton, Tag } from 'antd'
import api, { extractApiError } from '../../utils/api'
import '../../styles/resident-dashboard.css'

type ResidentOccupancy = {
  id: number
  name: string
  residentCategory: string | null
  occupancyStatus: string | null
}

const TemporaryResidence = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [residents, setResidents] = useState<ResidentOccupancy[]>([])

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await api.get('/households/me/residents')
        if (!mounted) return

        const rows = Array.isArray(response.data) ? response.data : []
        setResidents(rows)
      } catch (err) {
        if (!mounted) return
        setError(extractApiError(err, 'Không thể tải dữ liệu tạm trú/tạm vắng.'))
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
      <h2>Tạm trú / Tạm vắng</h2>
      {error && <Alert type="warning" showIcon message={error} />}

      <Card className="resident-dashboard__card" title="Danh sách trạng thái cư trú">
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : residents.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu trạng thái cư trú." />
        ) : (
          <List
            dataSource={residents}
            renderItem={(resident) => {
              const statusLabel = resident.occupancyStatus || 'UNKNOWN'
              const color =
                statusLabel === 'TEMPORARY_ABSENCE' ? 'orange' :
                statusLabel === 'TEMPORARY_STAY' ? 'blue' :
                'green'

              return (
                <List.Item className="resident-list-item">
                  <div>
                    <strong>{resident.name}</strong>
                    <p>{resident.residentCategory || 'PERMANENT'}</p>
                  </div>
                  <Tag color={color}>{statusLabel}</Tag>
                </List.Item>
              )
            }}
          />
        )}
      </Card>
    </div>
  )
}

export default TemporaryResidence
