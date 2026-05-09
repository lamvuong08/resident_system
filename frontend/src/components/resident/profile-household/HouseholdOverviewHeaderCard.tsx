import type { ReactNode } from 'react'
import { Skeleton, Tag } from 'antd'
import type { HouseholdSummary } from '../../../types/residentDashboard'
import { apartmentStatusBadge } from '../../../utils/householdProfile'

type HouseholdOverviewHeaderCardProps = {
  loading: boolean
  summary: HouseholdSummary | null
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="ph-kv">
    <span className="ph-kv__label">{label}</span>
    <div className="ph-kv__value">{children}</div>
  </div>
)

const HouseholdOverviewHeaderCard = ({ loading, summary }: HouseholdOverviewHeaderCardProps) => {
  const floorLabel = summary?.floorNumber != null ? String(summary.floorNumber) : '—'
  const areaLabel = summary?.area != null ? `${summary.area} m²` : '—'
  const memberLabel = summary?.memberCount != null ? String(summary.memberCount) : '—'
  const aptBadge = apartmentStatusBadge(summary?.apartmentStatus)

  return (
    <section className="ph-card ph-card--elevated ph-overview-card" aria-labelledby="ph-overview-heading">
      <div className="ph-overview-head">
        <h2 id="ph-overview-heading" className="ph-overview-card__title">
          Thông tin căn hộ
        </h2>
        <span className="ph-overview-code-pill" aria-label="Mã căn hộ">
          {summary?.apartmentCode || '—'}
        </span>
      </div>
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          <div className="ph-overview-split">
            <div className="ph-overview-col">
              <Field label="Tòa nhà:">{summary?.buildingName || '—'}</Field>
              <Field label="Tầng:">{floorLabel}</Field>
              <Field label="Diện tích:">{areaLabel}</Field>
            </div>
            <div className="ph-overview-col">
              <Field label="Chủ hộ:">{summary?.ownerName || '—'}</Field>
              <Field label="Trạng thái căn hộ:">
                <Tag color={aptBadge.color}>{aptBadge.label}</Tag>
              </Field>
              <Field label="Số thành viên:">{memberLabel}</Field>
            </div>
          </div>
          {!summary?.apartmentCode && (
            <p className="ph-overview-hint">Chưa có dữ liệu căn hộ gắn với tài khoản của bạn.</p>
          )}
        </>
      )}
    </section>
  )
}

export default HouseholdOverviewHeaderCard
