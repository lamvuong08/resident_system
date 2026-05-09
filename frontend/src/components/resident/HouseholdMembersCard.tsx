import { Empty, Skeleton, Tag } from 'antd'
import type { MyHouseholdResident } from '../../types/householdProfile'
import { formatResidentGender } from '../../utils/resident'
import { relationshipRoleBadge } from '../../utils/householdProfile'

type HouseholdMembersCardProps = {
  loading: boolean
  residents: MyHouseholdResident[]
  onAdd: () => void
  onExportPdf: () => void
  onView: (resident: MyHouseholdResident) => void
  onEdit: (resident: MyHouseholdResident) => void
}

const HouseholdMembersCard = ({
  loading,
  residents,
  onAdd,
  onExportPdf,
  onView,
  onEdit,
}: HouseholdMembersCardProps) => {
  return (
    <section className="ph-card ph-card--elevated ph-members-shell" aria-labelledby="ph-members-heading">
      <div className="ph-members-head">
        <h2 id="ph-members-heading" className="ph-members-title">
          Thành viên trong hộ
        </h2>
        <div className="ph-members-head__actions">
          <button type="button" className="ph-btn ph-btn--outline ph-btn--h32" onClick={onExportPdf}>
            Xuất PDF
          </button>
          <button type="button" className="ph-btn ph-btn--primary ph-btn--h32" onClick={onAdd}>
            Thêm cư dân
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : residents.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thành viên trong hộ khẩu." />
      ) : (
        <div className="ph-table-wrap">
          <table className="ph-table ph-table--resident">
            <thead>
              <tr>
                <th scope="col">Họ tên</th>
                <th scope="col" className="ph-table__th--center">Vai trò</th>
                <th scope="col" className="ph-table__th--center">Giới tính</th>
                <th scope="col" className="ph-table__th--center">Số điện thoại</th>
                <th scope="col" className="ph-table__th--actions">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {residents.map((r) => {
                const role = relationshipRoleBadge(r.relationship)
                return (
                  <tr key={r.id}>
                    <td className="ph-table__name ph-cell-nowrap">{r.name}</td>
                    <td className="ph-cell-center ph-cell-nowrap">
                      <Tag color={role.color}>{role.label}</Tag>
                    </td>
                    <td className="ph-cell-muted ph-cell-center ph-cell-nowrap">{formatResidentGender(r.gender)}</td>
                    <td className="ph-cell-phone ph-cell-center ph-cell-nowrap">{r.phone || '—'}</td>
                    <td className="ph-cell-actions">
                      <div className="ph-action-row">
                        <button type="button" className="ph-text-action ph-text-action--h32" onClick={() => onView(r)}>
                          Xem chi tiết
                        </button>
                        <button type="button" className="ph-text-action ph-text-action--h32" onClick={() => onEdit(r)}>
                          Cập nhật
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default HouseholdMembersCard
