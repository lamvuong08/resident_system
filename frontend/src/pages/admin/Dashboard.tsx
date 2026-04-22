import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import '../../styles/dashboard.css'
import { HomeOutlined, ApartmentOutlined, TeamOutlined } from '@ant-design/icons'
import StatCard from '../../components/StatCard.tsx'
import BuildingCard from '../../components/BuildingCard.tsx'
import type { Building } from '../../types/api'

type DashboardStats = {
  totalBuildings?: number
  totalApartments?: number
  occupiedApartments?: number
  vacantApartments?: number
  totalLivingResidents?: number
  totalResidents?: number
  totalTemporaryResidents?: number
  totalTemporaryAbsentResidents?: number
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {})
    api.get('/dashboard/buildings').then((r) => setBuildings(r.data)).catch(() => {})
  }, [])

  const navigate = useNavigate()

  return (
    <div className="dashboard-root">
      <div className="stats-row">
        <StatCard title="Tổng số tòa nhà" value={stats?.totalBuildings ?? 0} icon={<ApartmentOutlined style={{ color: '#0f766e' }} />} />
        <StatCard title="Tổng số căn hộ" value={stats?.totalApartments ?? 0} icon={<HomeOutlined style={{ color: '#3b82f6' }} />} />
        <StatCard title="Căn hộ đã có người ở" value={stats?.occupiedApartments ?? 0} icon={<HomeOutlined style={{ color: '#3b82f6' }} />} />
        <StatCard title="Căn hộ còn trống" value={stats?.vacantApartments ?? 0} icon={<HomeOutlined style={{ color: '#22c55e' }} />} />
        <StatCard title="Tổng cư dân đang sống" value={stats?.totalLivingResidents ?? stats?.totalResidents ?? 0} icon={<TeamOutlined style={{ color: '#f59e0b' }} />} />
        <StatCard title="Tổng tạm trú" value={stats?.totalTemporaryResidents ?? 0} icon={<TeamOutlined style={{ color: '#2563eb' }} />} />
        <StatCard title="Tổng tạm vắng" value={stats?.totalTemporaryAbsentResidents ?? 0} icon={<TeamOutlined style={{ color: '#f97316' }} />} />
      </div>

      <h3 className="section-title">Danh sách tòa nhà</h3>
      <div className="dashboard-content">
        <div className="dashboard-main">
          <div className="buildings-grid">
            {buildings.map((building) => (
              <BuildingCard
                key={building.id}
                building={building}
                onView={() => navigate('/admin/quan-ly-toa-nha', { state: { buildingId: building.id } })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
