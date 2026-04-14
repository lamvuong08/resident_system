import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../../utils/api'
import '../../styles/dashboard.css'

const HouseholdManagement: React.FC = () => {
  const loc: any = useLocation()
  const state = loc.state || {}
  const building = state.buildingId || 'Tòa chưa chọn'
  const apartment = state.aptCode || null

  const [residents, setResidents] = useState<any[]>([])

  useEffect(() => {
    if (apartment) {
      api.get(`/apartments/${apartment}/residents`).then((r) => setResidents(r.data)).catch(() => setResidents([]))
    }
  }, [apartment])

  return (
    <div style={{ padding: 24 }}>
      <div className="breadcrumb">Dashboard &gt; {building} &gt; Căn hộ {apartment || '---'}</div>
      <h2>Quản lý hộ khẩu</h2>

      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 20px rgba(2,6,23,0.04)' }}>
            <h3>Thông tin căn hộ</h3>
            <div>Mã căn hộ: <strong>{apartment}</strong></div>
            <div>Tòa: <strong>{building}</strong></div>
          </div>

          <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 20px rgba(2,6,23,0.04)', marginTop: 12 }}>
            <h3>Danh sách cư dân</h3>
            {residents.length === 0 ? (
              <div>Không có cư dân</div>
            ) : (
              <ul>
                {residents.map((r) => (
                  <li key={r.id}>{r.name} — {r.age} tuổi — {r.phone}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ width: 320 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 20px rgba(2,6,23,0.04)' }}>
            <h3>Hành động</h3>
            <button className="btn-view" style={{ width: '100%' }}>Thêm cư dân</button>
            <button className="btn-view" style={{ width: '100%', marginTop: 8 }}>Sửa thông tin hộ khẩu</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HouseholdManagement
