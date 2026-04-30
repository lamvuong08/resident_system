import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import RequestListCard from '../../components/resident/RequestListCard'
import { getResidentRequests } from '../../utils/residentDashboard'
import type { DashboardRequest } from '../../types/residentDashboard'
import '../../styles/resident-dashboard.css'

const Requests = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<DashboardRequest[]>([])

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getResidentRequests()
        if (mounted) {
          setRequests(data)
        }
      } catch {
        if (mounted) {
          setError('Không thể tải danh sách yêu cầu hỗ trợ.')
          setRequests([])
        }
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

  return (
    <div className="resident-page">
      <h2>Yêu cầu & Hỗ trợ</h2>
      {error && <Alert type="warning" showIcon message={error} />}
      <RequestListCard loading={loading} items={requests} />
    </div>
  )
}

export default Requests
