import React from 'react'

const StatCard: React.FC<{ title: string; value: any; icon?: React.ReactNode }> = ({ title, value, icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
      </div>
    </div>
  )
}

export default StatCard
