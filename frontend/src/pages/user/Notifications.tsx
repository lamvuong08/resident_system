import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import NotificationsListCard from '../../components/resident/NotificationsListCard'
import { getResidentNotifications } from '../../utils/residentDashboard'
import type { DashboardNotification } from '../../types/residentDashboard'
import '../../styles/resident-dashboard.css'

const Notifications = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<DashboardNotification[]>([])

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getResidentNotifications()
        if (mounted) {
          setNotifications(data)
        }
      } catch {
        if (mounted) {
          setError('Không thể tải thông báo.')
          setNotifications([])
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
      <h2>Thông báo</h2>
      {error && <Alert type="warning" showIcon message={error} />}
      <NotificationsListCard loading={loading} items={notifications} onViewAll={() => {}} />
    </div>
  )
}

export default Notifications
