import React from 'react'
import { useNavigate } from 'react-router-dom'
import { UserOutlined } from '@ant-design/icons'
import type { Apartment } from '../types/api'

const ApartmentGrid: React.FC<{ apartments: Apartment[]; buildingId?: number | string }> = ({ apartments, buildingId }) => {
  const navigate = useNavigate()
  const statusClass = (s?: string | null) => {
    if (s === 'OCCUPIED') return 'apt-occupied'
    if (s === 'EMPTY') return 'apt-vacant'
    if (s === 'PENDING') return 'apt-pending'
    return ''
  }

  return (
    <div className="apartment-grid">
      {apartments.map((ap) => (
        <div
          key={ap.code}
          className={`apt-card ${statusClass(ap.status)}`}
          onClick={() => {
            if (!ap.code) return
            navigate('/admin/quan-ly-can-ho', { state: { buildingId, aptCode: ap.code } })
          }}
        >
          <div className="apt-top">
            <div className="apt-code">{ap.code}</div>
            <div className="apt-icon"><UserOutlined /></div>
          </div>

          <div className="apt-owner">{ap.ownerName || ap.owner || '---'}</div>
          <div className="apt-people">{ap.peopleCount ?? ap.people ?? 0} người</div>
          <div className="apt-status">{ap.status === 'OCCUPIED' ? 'Đã ở' : ap.status === 'EMPTY' ? 'Trống' : 'Đang chờ'}</div>
        </div>
      ))}
    </div>
  )
}

export default ApartmentGrid
