import React, { useState, useEffect, useMemo } from 'react'
import { DownOutlined } from '@ant-design/icons'
import ApartmentGrid from './ApartmentGrid.tsx'

const BuildingDetailPanel: React.FC<{
  building: any
  onClose: () => void
  groupByFloor?: boolean
}> = ({ building, onClose, groupByFloor }) => {
  const [floorFilter, setFloorFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const apartments = building.apartments || []
  const filtered = apartments.filter((ap: any) => {
    if (floorFilter) {
      const floor = ap.code.split('-')[1].slice(0, 2)
      if (floor !== floorFilter) return false
    }

    if (statusFilter !== 'ALL') {
      if (
        statusFilter === 'OCCUPIED' &&
        ap.status !== 'OCCUPIED'
      )
        return false

      if (
        statusFilter === 'VACANT' &&
        ap.status !== 'VACANT'
      )
        return false
    }

    if (
      search &&
      !ap.code
        .toLowerCase()
        .includes(search.toLowerCase())
    )
      return false

    return true
  })

  const floors: string[] = useMemo(() =>
    Array.from(
      new Set<string>(
        apartments.map((a: any) =>
          String(a.code.split('-')[1].slice(0, 2))
        )
      )
    ).sort((a, b) => Number(a) - Number(b)),
    [apartments]
  )

  const [collapsedFloors, setCollapsedFloors] =
    useState<Record<string, boolean>>({})

  useEffect(() => {
    const init: Record<string, boolean> = {}

    floors.forEach((f) => {
      init[f] = true
    })

    setCollapsedFloors((prev) => {
      if (Object.keys(prev).length === 0 && Object.keys(init).length > 0) {
        return init
      }
      return prev
    })
  }, [floors])

  const toggleFloor = (floor: string) => {
    setCollapsedFloors((prev) => ({
      ...prev,
      [floor]: !prev[floor]
    }))
  }

  const grouped: Record<string, any[]> = {}

  apartments.forEach((a: any) => {
    const floor = a.code.split('-')[1].slice(0, 2)

    if (!grouped[floor]) grouped[floor] = []

    grouped[floor].push(a)
  })

  return (
    <div className="building-detail">
      <div className="detail-header">
        <h3>Chi tiết {building.name}</h3>

        <button
          className="btn-close"
          onClick={onClose}
        >
          Đóng
        </button>
      </div>

      <div className="detail-info">
        <div>Tổng tầng: {building.floors}</div>
        <div>
          Tổng căn hộ: {building.totalApartments}
        </div>
        <div>Đã ở: {building.occupied}</div>
        <div>Còn trống: {building.vacant}</div>
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
              const items = grouped[
                f
              ].filter((ap: any) => {
                if (
                  statusFilter !==
                    'ALL' &&
                  ap.status !==
                    statusFilter
                )
                  return false

                if (
                  search &&
                  !ap.code
                    .toLowerCase()
                    .includes(
                      search.toLowerCase()
                    )
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
                    {items.map(
                      (ap: any) => (
                        <div
                          key={ap.code}
                          style={{
                            width: 140,
                            marginRight: 12
                          }}
                        >
                          <ApartmentGrid
                            apartments={[
                              ap
                            ]}
                            buildingId={
                              building.id
                            }
                          />
                        </div>
                      )
                    )}
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