import React from 'react'
import { ApartmentOutlined } from '@ant-design/icons'

const BuildingCard: React.FC<{ building: any; onView: () => void; selected?: boolean }> = ({ building, onView, selected }) => {
  const pct = Math.round(((building.residents || 0) / Math.max(1, building.apartments || 1)) * 100)
  return (
    <div className={`building-card ${selected ? 'selected' : ''}`} role="button">
      <div className="building-top">
        <div className="building-icon-wrap"><ApartmentOutlined className="building-icon" /></div>
        <div style={{flex:1}}>
          <div className="building-title">{building.name}</div>
          <div className="building-sub">{building.code || ''}</div>
        </div>
      </div>

      <div className="building-body">
        <div className="info-row">
          <div className="info-label">Tổng số tầng</div>
          <div className="info-value">{building.floors}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Tổng cư dân</div>
          <div className="info-value">{building.residents}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Căn hộ trống</div>
          <div className="info-value">{building.apartments - (building.residents ? Math.floor(building.residents/3) : 0)}</div>
        </div>
      </div>

      <div className="building-footer">
        <div className="progress-wrap">
          <div className="progress" style={{ width: `${Math.min(pct,100)}%` }} />
        </div>
      </div>

      <div className="building-card-action">
        <button onClick={onView} className={`btn-view-full ${selected ? 'active' : ''}`}>
          {selected ? 'ĐANG XEM CHI TIẾT' : 'Xem chi tiết'}
        </button>
      </div>
    </div>
  )
}

export default BuildingCard
