import React, { useState, useMemo } from 'react'
import { DownOutlined } from '@ant-design/icons'
import ApartmentGrid from './ApartmentGrid.tsx'
import type { Building, Apartment } from '../types/api'

const BuildingDetailPanel: React.FC<{
  building: Building
  onClose: () => void
  groupByFloor?: boolean
}> = ({ building, onClose, groupByFloor }) => {
  const [floorFilter, setFloorFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const apartments: Apartment[] = building.apartments || []
  const isVacant = (status?: string | null) => (status || '').toUpperCase() === 'EMPTY' || (status || '').toUpperCase() === 'VACANT'

  const getFloorFromCode = (code?: string | null) => {
    if (!code) return ''
    const parts = String(code).split('-')
    if (parts.length < 2) return ''
    return String(parts[1]).slice(0, 2)
  }

  const filtered = apartments.filter((ap: Apartment) => {
    const floor = getFloorFromCode(ap.code ?? null)
    if (floorFilter) {
      if (floor !== floorFilter) return false
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OCCUPIED' && ap.status !== 'OCCUPIED') return false
      if (statusFilter === 'VACANT' && !isVacant(ap.status)) return false
    }

    if (search && !(ap.code || '').toLowerCase().includes(search.toLowerCase())) return false

    return true
  })

  const floors: string[] = useMemo(() =>
    Array.from(new Set<string>(apartments.map((a: Apartment) => getFloorFromCode(a.code ?? null))))
      .filter((f) => f)
      .sort((a, b) => Number(a) - Number(b)),
    [apartments]
  )

  const [collapsedFloors, setCollapsedFloors] =
    useState<Record<string, boolean>>(() => {
      const init: Record<string, boolean> = {}
      floors.forEach((f) => {
        init[f] = true
      })
      return init
    })

  const toggleFloor = (floor: string) => {
    setCollapsedFloors((prev) => ({
      ...prev,
      [floor]: !prev[floor]
    }))
  }

  const grouped: Record<string, Apartment[]> = {}

  apartments.forEach((a: Apartment) => {
    const floor = getFloorFromCode(a.code ?? null)
    if (!grouped[floor]) grouped[floor] = []
    grouped[floor].push(a)
  })

  return (
    <div className="building-detail">
      <div className="detail-header">
        <h3 className="section-title">Chi tiết tòa {building.name}</h3>

        <button
          className="btn-close"
          onClick={onClose}
        >
          Đóng
        </button>
      </div>

      <div className="detail-info">
        <div className="detail-stat">
          <span className="detail-stat-label">Tổng tầng</span>
          <span className="detail-stat-value">{building.floors}</span>
        </div>

        <div className="detail-stat">
          <span className="detail-stat-label">Tổng căn hộ</span>
          <span className="detail-stat-value">{building.totalApartments}</span>
        </div>

        <div className="detail-stat">
          <span className="detail-stat-label">Đã ở</span>
          <span className="detail-stat-value">{building.occupied}</span>
        </div>

        <div className="detail-stat">
          <span className="detail-stat-label">Còn trống</span>
          <span className="detail-stat-value">{building.vacant}</span>
        </div>
      </div>

      <div className="detail-filters">
        <div className="filter-controls">
          <div className="search-box">
            <span
              className="search-icon"
              aria-hidden
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M21 21l-4.35-4.35"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="11"
                  cy="11"
                  r="6"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
              </svg>
            </span>

            <input
              className="search-input"
              placeholder="Tìm mã căn hộ"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div className="filter-right">
            <select
              className="search-select"
              value={floorFilter || ''}
              onChange={(e) =>
                setFloorFilter(
                  e.target.value || null
                )
              }
            >
              <option value="">
                Tất cả các tầng
              </option>

              {floors.map((f) => (
                <option
                  key={f}
                  value={f}
                >
                  Tầng {Number(f)}
                </option>
              ))}
            </select>

            <select
              className="search-select"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >
              <option value="ALL">
                Tất cả trạng thái
              </option>
              <option value="OCCUPIED">
                Đã ở
              </option>
              <option value="VACANT">
                Trống
              </option>
            </select>
          </div>
        </div>
      </div>

      {groupByFloor ? (
        <div className="floors-list">
          {Object.keys(grouped)
            .filter(
              (f) =>
                !floorFilter ||
                f === floorFilter
            )
            .sort(
              (a, b) =>
                Number(a) - Number(b)
            )
            .map((f) => {
              const items = grouped[f].filter((ap: Apartment) => {
                if (
                  statusFilter !==
                    'ALL' &&
                  !(
                    statusFilter === 'VACANT'
                      ? isVacant(ap.status)
                      : ap.status === statusFilter
                  )
                )
                  return false

                if (
                    search && !(ap.code || '').toLowerCase().includes(search.toLowerCase())
                )
                  return false

                return true
              })

              if (
                !items ||
                items.length === 0
              )
                return null

              const isCollapsed =
                !!collapsedFloors[f]

              return (
                <div
                  key={f}
                  className="floor-row"
                >
                  <div className="floor-title">
                    <span>
                      Tầng {Number(f)}
                    </span>

                    <button
                      className="floor-toggle"
                      onClick={() =>
                        toggleFloor(f)
                      }
                    >
                      <DownOutlined
                        className={`floor-toggle-icon ${
                          isCollapsed
                            ? 'rotated'
                            : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div
                    className={`floor-apts ${
                      isCollapsed
                        ? 'collapsed'
                        : ''
                    }`}
                  >
                    {items.map((ap: Apartment) => (
                      <div key={ap.code} style={{ width: 140, marginRight: 12 }}>
                        <ApartmentGrid apartments={[ap]} buildingId={building.id} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      ) : (
        <ApartmentGrid
          apartments={filtered}
          buildingId={building.id}
        />
      )}
    </div>
  )
}

export default BuildingDetailPanel