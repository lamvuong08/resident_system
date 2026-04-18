import React, { useEffect, useState } from 'react'
import api from '../../utils/api'
import BuildingCard from '../../components/BuildingCard'
import BuildingDetailPanel from '../../components/BuildingDetailPanel'
import '../../styles/dashboard.css'
import { useLocation } from 'react-router-dom'

const BuildingManagement: React.FC = () => {
  const [buildings, setBuildings] = useState<any[]>([])
  const [detail, setDetail] = useState<any | null>(null)
  const location: any = useLocation()
  const requested = location.state?.buildingId || null

  const loadBuildingDetail = async (buildingId: string) => {
    try {
      const response = await api.get(`/dashboard/buildings/${buildingId}`)
      setDetail(response.data)
    } catch {
      setDetail(null)
    }
  }

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const response = await api.get('/dashboard/buildings')
        const buildingList = response.data || []
        setBuildings(buildingList)

        if (buildingList.length > 0) {
          await loadBuildingDetail(buildingList[0].id)
        }
      } catch {
        setBuildings([])
        setDetail(null)
      }
    }

    void loadBuildings()
  }, [])

  useEffect(() => {
    if (requested) {
      void loadBuildingDetail(requested)
    }
  }, [requested])

  return (
    <div className="dashboard-root">
      <div className="stats-row" style={{ marginBottom: 18 }}>
      </div>

      <h3 className="section-title">Danh sách tòa nhà</h3>
      <div className="buildings-grid">
        {buildings.map((b) => (
          <BuildingCard key={b.id} building={b} selected={detail?.id === b.id || false} onView={() => {
            void loadBuildingDetail(b.id)
          }} />
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="management-panel">
          <div style={{ flex: 1 }}>
            {detail ? (
              <BuildingDetailPanel building={detail} onClose={() => setDetail(null)} groupByFloor />
            ) : (
              <div style={{ background: '#fff', padding: 18, borderRadius: 12, boxShadow: '0 8px 20px rgba(2,6,23,0.04)' }}>
                Chọn tòa nhà để quản lý
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuildingManagement
