import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../../utils/api'

const ApartmentManagement: React.FC = () => {
  const loc: any = useLocation()
  const state = loc.state || {}
  const building = state.buildingId || 'Tòa chưa chọn'
  const apartment = state.aptCode || null

  const [aptData, setAptData] = useState<any | null>(null)

  useEffect(() => {
    if (apartment) {
      api.get(`/apartments/${apartment}`).then((r) => setAptData(r.data)).catch(() => setAptData(null))
    }
  }, [apartment])

  return (
    <div style={{ padding: 24 }}>
      <div className="breadcrumb">Dashboard &gt; {building} &gt; Căn hộ {apartment || '---'}</div>
      <h2>Quản lý căn hộ</h2>

      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 20px rgba(2,6,23,0.04)' }}>
            <h3>Thông tin căn hộ</h3>
            <div>Mã căn hộ: <strong>{apartment}</strong></div>
            <div>Tòa: <strong>{building}</strong></div>
            <div>Trạng thái: <strong>{aptData?.status || '—'}</strong></div>
            <div>Chủ hộ: <strong>{aptData?.owner || '—'}</strong></div>
            <div>Số người: <strong>{aptData?.people ?? '—'}</strong></div>
          </div>

          <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 20px rgba(2,6,23,0.04)', marginTop: 12 }}>
            <h3>Hành động</h3>
            <button className="btn-view" style={{ width: '100%' }}>Sửa căn hộ</button>
            <button className="btn-view" style={{ width: '100%', marginTop: 8 }}>Quản lý hộ khẩu</button>
          </div>
        </div>

        <div style={{ width: 320 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 20px rgba(2,6,23,0.04)' }}>
            <h3>Thông báo</h3>
            <div>Không có thông báo</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApartmentManagement
