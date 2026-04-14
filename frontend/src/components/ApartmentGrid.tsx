import React from 'react'
import { useNavigate } from 'react-router-dom'
import { UserOutlined } from '@ant-design/icons'

const ApartmentGrid: React.FC<{ apartments: any[]; buildingId: string }> = ({ apartments, buildingId }) => {
  const navigate = useNavigate()
  const statusClass = (s: string) => {
    if (s === 'OCCUPIED') return 'apt-occupied'
    if (s === 'VACANT') return 'apt-vacant'
    if (s === 'PENDING') return 'apt-pending'
    return ''
  }

  return (
    <div className="apartment-grid">
      {apartments.map((ap) => (
        <div key={ap.code} className={`apt-card ${statusClass(ap.status)}`} onClick={() => navigate('/admin/quan-ly-can-ho', { state: { buildingId, aptCode: ap.code } })}>
          <div className="apt-top">
            <div className="apt-code">{ap.code}</div>
            <div className="apt-icon"><UserOutlined /></div>
          </div>

          <div className="apt-owner">{ap.owner || '---'}</div>
          <div className="apt-people">{ap.people} người</div>
          <div className="apt-status">{ap.status === 'OCCUPIED' ? 'Đã ở' : ap.status === 'VACANT' ? 'Trống' : 'Đang chờ'}</div>
        </div>
      ))}
    </div>
  )
}

export default ApartmentGrid
