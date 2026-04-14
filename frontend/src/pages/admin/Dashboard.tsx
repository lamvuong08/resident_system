import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import '../../styles/dashboard.css'
import { InfoCircleOutlined, HomeOutlined, ApartmentOutlined, UserOutlined, ExclamationCircleOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons'
import StatCard from '../../components/StatCard.tsx'
import BuildingCard from '../../components/BuildingCard.tsx'
import BuildingDetailPanel from '../../components/BuildingDetailPanel.tsx'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null)
  const [buildings, setBuildings] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<any | null>(null)

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {})
    api.get('/dashboard/buildings').then((r) => setBuildings(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selected) {
      api.get(`/dashboard/buildings/${selected}`).then((r) => setDetail(r.data)).catch(() => setDetail(null))
    }
  }, [selected])

  const navigate = useNavigate()

  return (
    <div className="dashboard-root">
      <div className="stats-row">
        <StatCard title="Tổng số tòa nhà" value={stats?.totalBuildings ?? '—'} icon={<ApartmentOutlined style={{ color: '#0f766e' }} />} />
        <StatCard title="Tổng số căn hộ" value={stats?.totalApartments ?? '—'} icon={<HomeOutlined style={{ color: '#3b82f6' }} />} />
        <StatCard title="Căn hộ đã có người ở" value={stats?.occupiedApartments ?? '—'} icon={<HomeOutlined style={{ color: '#3b82f6' }} />} />
        <StatCard title="Căn hộ còn trống" value={stats?.vacantApartments ?? '—'} icon={<HomeOutlined style={{ color: '#22c55e' }} />} />
        <StatCard title="Tổng cư dân" value={stats?.totalResidents ?? '—'} icon={<TeamOutlined style={{ color: '#f59e0b' }} />} />
        <StatCard title="Yêu cầu chưa xử lý" value={stats?.pendingRequests ?? '—'} icon={<ClockCircleOutlined style={{ color: '#f59e0b' }} />} />
      </div>

      <h3 className="section-title">Danh sách tòa nhà</h3>
      <div className="dashboard-content">
        <div className="dashboard-main">
              <div className="buildings-grid">
                {buildings.map((b) => (
                  <BuildingCard key={b.id} building={b} onView={() => navigate('/admin/quan-ly-toa-nha', { state: { buildingId: b.id } })} />
                ))}
              </div>

          {detail && (
            <div className="building-detail-inline">
              <BuildingDetailPanel building={detail} onClose={() => { setSelected(null); setDetail(null) }} />
            </div>
          )}
        </div>

        <aside className="dashboard-side">
          {detail ? (
            <BuildingDetailPanel building={detail} onClose={() => { setSelected(null); setDetail(null) }} />
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export default Dashboard
