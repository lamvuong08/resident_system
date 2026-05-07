import { Avatar, Button, Drawer, Tag } from 'antd'
import type { MyHouseholdResident } from '../../types/householdProfile'
import {
  occupancyStatusBadgeColor,
  occupancyStatusLabel,
  relationshipRoleBadge,
} from '../../utils/householdProfile'
import { formatDateVN, formatResidentGender } from '../../utils/resident'
import { displayInitials } from '../../utils/displayInitials'

type HouseholdResidentDetailModalProps = {
  open: boolean
  resident: MyHouseholdResident | null
  apartmentCode?: string | null
  onClose: () => void
  onEdit?: (resident: MyHouseholdResident) => void
}

const formatChunk = (value: string | null | undefined) => {
  const raw = String(value || '').replace(/\s+/g, '')
  if (!raw) return '—'
  return raw.replace(/(.{4})/g, '$1 ').trim()
}

const HouseholdResidentDetailModal = ({
  open,
  resident,
  apartmentCode,
  onClose,
  onEdit,
}: HouseholdResidentDetailModalProps) => {
  const role = resident ? relationshipRoleBadge(resident.relationship) : null
  const occColor = resident ? occupancyStatusBadgeColor(resident.occupancyStatus) : 'default'
  const initials = displayInitials(resident?.name || '')

  const renderRow = (label: string, value: string) => (
    <div className="ph-drawer-row">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )

  return (
    <Drawer
      title={null}
      placement="right"
      size="default"
      onClose={onClose}
      open={open}
      destroyOnClose
      className="profile-household__resident-drawer"
    >
      {resident && role ? (
        <div className="ph-drawer-detail">
          <header className="ph-drawer-hero">
            <Avatar size={56} className="ph-drawer-avatar">
              {initials}
            </Avatar>
            <h2 className="ph-drawer-name">{resident.name || 'Cư dân'}</h2>
            <Tag color={role.color} className="ph-drawer-role-tag">
              {role.label}
            </Tag>
          </header>

          <section className="ph-drawer-section">
            <h3 className="ph-drawer-section__label">Thông tin cá nhân</h3>
            <dl className="ph-drawer-dl">
              {renderRow('Giới tính', formatResidentGender(resident.gender))}
              {renderRow('Ngày sinh', formatDateVN(resident.dob))}
              {renderRow('CCCD', formatChunk(resident.cccd))}
            </dl>
          </section>

          <section className="ph-drawer-section">
            <h3 className="ph-drawer-section__label">Liên hệ</h3>
            <dl className="ph-drawer-dl">
              {renderRow('Số điện thoại', formatChunk(resident.phone))}
            </dl>
          </section>

          <section className="ph-drawer-section">
            <h3 className="ph-drawer-section__label">Hộ khẩu</h3>
            <dl className="ph-drawer-dl">
              {renderRow('Căn hộ', apartmentCode || '—')}
              <div className="ph-drawer-row">
                <dt>Trạng thái cư trú</dt>
                <dd>
                  <Tag color={occColor} className="ph-drawer-status-tag">
                    {occupancyStatusLabel(resident.occupancyStatus)}
                  </Tag>
                </dd>
              </div>
            </dl>
          </section>

          <div className="ph-drawer-actions">
            <Button
              type="primary"
              className="ph-drawer-btn ph-drawer-btn--primary"
              disabled={!onEdit}
              onClick={() => onEdit?.(resident)}
            >
              Cập nhật
            </Button>
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}

export default HouseholdResidentDetailModal
