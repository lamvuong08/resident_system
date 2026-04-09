import React from 'react'

const PagePlaceholder: React.FC<{ title?: string }> = ({ title }) => {
  return (
    <div style={{ padding: 24 }}>
      <h2>{title || 'Trang'}</h2>
      <div style={{ height: 360, border: '1px dashed rgba(0,0,0,0.06)', borderRadius: 8, marginTop: 12 }} />
    </div>
  )
}

export default PagePlaceholder
