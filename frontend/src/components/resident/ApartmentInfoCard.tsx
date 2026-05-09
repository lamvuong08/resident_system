import { Card, Skeleton } from 'antd'

type ApartmentInfoCardProps = {
  loading: boolean
  buildingName: string
  apartmentCode: string
  apartmentStatus: string
  memberCount: number
  floorNumber?: number | null
  area?: number | null
  ownerName?: string | null
}

const ApartmentInfoCard = ({
  loading,
  buildingName,
  apartmentCode,
  apartmentStatus,
  memberCount,
  floorNumber,
  area,
  ownerName,
}: ApartmentInfoCardProps) => {
  const normalizedStatus = apartmentStatus.toUpperCase()
  const statusLabel =
    normalizedStatus === 'RENTED' ? 'Cho thuê' :
    normalizedStatus === 'VACANT' ? 'Trống' :
    'Đang ở'

  const statusColor =
    normalizedStatus === 'VACANT' ? 'orange' :
    normalizedStatus === 'RENTED' ? 'blue' :
    'green'

  const floorLabel = floorNumber ?? '-'
  const areaLabel = area != null ? `${area} m²` : '-'
  const ownerLabel = ownerName || '-'

  return (
    <Card className="resident-dashboard__card" title="Thông tin căn hộ">
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : (
        <div className="resident-apartment-info">
          <div className="resident-apartment-info__col">
            <div className="info-row">
              <span className="info-label">Mã căn hộ:</span>
              <span className="info-value">{apartmentCode}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tầng:</span>
              <span className="info-value">{floorLabel}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Trạng thái:</span>
              <span className={`info-value apartment-status apartment-status--${statusColor}`}>{statusLabel}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Số người ở:</span>
              <span className="info-value">{memberCount}</span>
            </div>
          </div>
          <div className="resident-apartment-info__col">
            <div className="info-row">
              <span className="info-label">Tòa nhà:</span>
              <span className="info-value">{buildingName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Diện tích:</span>
              <span className="info-value">{areaLabel}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Chủ hộ:</span>
              <span className="info-value">{ownerLabel}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default ApartmentInfoCard
