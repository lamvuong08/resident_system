import { useEffect, useState } from 'react'
import { Alert, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import ApartmentInfoCard from '../../components/resident/ApartmentInfoCard'
import NotificationsListCard from '../../components/resident/NotificationsListCard'
import PaymentSummaryCard from '../../components/resident/PaymentSummaryCard'
import RequestListCard from '../../components/resident/RequestListCard'
import QuickActions from '../../components/resident/QuickActions'
import { getResidentDashboardData } from '../../utils/residentDashboard'
import type { ResidentDashboardData } from '../../types/residentDashboard'
import '../../styles/resident-dashboard.css'

const Home = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<ResidentDashboardData>({
    summary: null,
    notifications: [],
    payments: [],
    requests: [],
    unreadNotifications: 0,
    inProgressRequests: 0,
    totalUnpaidAmount: 0,
  })

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await getResidentDashboardData()
        if (!mounted) {
          return
        }
        setDashboardData(response)
      } catch {
        if (!mounted) {
          return
        }
        setError('Không thể tải dữ liệu dashboard cư dân. Vui lòng thử lại sau.')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  if (loading && !dashboardData.summary) {
    return <Spin className="resident-dashboard__loading" />
  }

  return (
    <div className="resident-dashboard">
      {error && <Alert type="warning" showIcon message={error} />}

      <section className="resident-dashboard__quick-actions">
        <QuickActions
          onCreateRequest={() => navigate('/user/requests?tab=create')}
          onPayNow={() => navigate('/user/payment')}
          onViewNotifications={() => navigate('/user/notifications')}
        />
      </section>

      <div className="resident-dashboard__cards">
        <ApartmentInfoCard
          loading={loading}
          buildingName={dashboardData.summary?.buildingName || 'Chưa có thông tin'}
          apartmentCode={dashboardData.summary?.apartmentCode || 'Chưa có thông tin'}
          apartmentStatus={dashboardData.summary?.apartmentStatus || 'ACTIVE'}
          memberCount={dashboardData.summary?.memberCount ?? 0}
          floorNumber={dashboardData.summary?.floorNumber ?? null}
          area={dashboardData.summary?.area ?? null}
          ownerName={dashboardData.summary?.ownerName ?? null}
        />
        <PaymentSummaryCard
          loading={loading}
          items={dashboardData.payments}
          totalUnpaidAmount={dashboardData.totalUnpaidAmount}
          onPayNow={() => navigate('/user/payment')}
        />
        <NotificationsListCard
          loading={loading}
          items={dashboardData.notifications}
          onViewAll={() => navigate('/user/notifications')}
        />
        <RequestListCard loading={loading} items={dashboardData.requests} />
      </div>
    </div>
  )
}

export default Home
