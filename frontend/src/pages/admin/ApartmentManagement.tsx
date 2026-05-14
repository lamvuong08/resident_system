import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Select, Space, Empty, Typography, Alert, Spin } from 'antd'
import ApartmentDetail from '../../components/ApartmentDetail'
import api from '../../utils/api'
import type { Apartment, Building } from '../../types/api'

const { Text } = Typography
const LAST_APARTMENT_CODE_KEY = 'admin.lastSelectedApartmentCode'

const parseApartmentPayload = (payload: unknown): Apartment | null => {
  let parsedPayload = payload

  while (typeof parsedPayload === 'string') {
    try {
      parsedPayload = JSON.parse(parsedPayload)
    } catch {
      break
    }
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return null
  }

  const source = parsedPayload as Record<string, unknown>
  const codeValue = (source.code as string | undefined) ?? (source.apartmentCode as string | undefined)
  const floorValue = (source.floorNumber as number | undefined) ?? (source.floor as number | undefined)

  return {
    code: codeValue,
    floorNumber: floorValue,
    area: (source.area as number | null | undefined) ?? null,
    status: (source.status as string | null | undefined) ?? null,
    ownerName: (source.ownerName as string | null | undefined) ?? (source.owner as string | null | undefined) ?? null,
    peopleCount: (source.peopleCount as number | undefined) ?? (source.people as number | undefined) ?? 0,
    buildingName: (source.buildingName as string | null | undefined) ?? null,
    householdId: (source.householdId as number | null | undefined) ?? null,
  }
}

const ApartmentManagement: React.FC = () => {
  const loc = useLocation()
  const navigate = useNavigate()
  const state = (loc.state as { aptCode?: string; buildingId?: string } | null) ?? {}
  const params = new URLSearchParams(loc.search || '')
  const requestedApartmentCode = state.aptCode || params.get('apt') || null
  const requestedBuildingId = state.buildingId || params.get('buildingId') || null

  const [aptData, setAptData] = useState<Apartment | null>(null)
  const [activeApartmentCode, setActiveApartmentCode] = useState<string | null>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(requestedBuildingId)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingApartments, setBuildingApartments] = useState<Apartment[]>([])
  const [loadingSelector, setLoadingSelector] = useState(false)
  const [loadingApartment, setLoadingApartment] = useState(false)
  const [selectorError, setSelectorError] = useState<string | null>(null)

  const loadBuildings = async () => {
    setLoadingSelector(true)
    setSelectorError(null)
    try {
      const response = await api.get('/dashboard/buildings')
      const buildingList = Array.isArray(response.data) ? response.data : []
      setBuildings(buildingList)
      return buildingList
    } catch {
      setBuildings([])
      setSelectorError('Không thể tải danh sách tòa nhà. Vui lòng thử lại.')
      return []
    } finally {
      setLoadingSelector(false)
    }
  }

  const loadBuildingApartments = async (buildingId: string) => {
    try {
      const response = await api.get(`/dashboard/buildings/${buildingId}`)
      const apartments = Array.isArray(response.data?.apartments) ? response.data.apartments : []
      setBuildingApartments(apartments)
      return apartments
    } catch {
      setBuildingApartments([])
      return []
    }
  }

  const loadApartmentDetail = async (apartmentCode: string) => {
    setLoadingApartment(true)
    try {
      const response = await api.get(`/apartments/${apartmentCode}`)
      const normalized = parseApartmentPayload(response.data)
      setAptData(normalized)
      setActiveApartmentCode(apartmentCode)
      localStorage.setItem(LAST_APARTMENT_CODE_KEY, apartmentCode)
    } catch {
      setAptData(null)
    } finally {
      setLoadingApartment(false)
    }
  }

  const reloadApartmentDetail = async () => {
    if (!activeApartmentCode) return
    await loadApartmentDetail(activeApartmentCode)
  }

  useEffect(() => {
    const initDirectEntryFlow = async () => {
      const buildingsList = await loadBuildings()
      const lastApartmentCode = localStorage.getItem(LAST_APARTMENT_CODE_KEY)
      const initialApartmentCode = requestedApartmentCode || lastApartmentCode || null

      if (requestedBuildingId) {
        setSelectedBuildingId(requestedBuildingId)
        void loadBuildingApartments(requestedBuildingId)
      } else if (buildingsList.length > 0) {
        setSelectedBuildingId((current) => current || String(buildingsList[0].id))
      }

      if (initialApartmentCode) {
        await loadApartmentDetail(initialApartmentCode)
      } else {
        setAptData(null)
        setActiveApartmentCode(null)
      }
    }

    void initDirectEntryFlow()
  }, [requestedApartmentCode, requestedBuildingId])

  useEffect(() => {
    if (!selectedBuildingId) {
      setBuildingApartments([])
      return
    }

    void loadBuildingApartments(selectedBuildingId)
  }, [selectedBuildingId])

  useEffect(() => {
    if (!activeApartmentCode) return
    if (buildingApartments.length === 0) return

    const exists = buildingApartments.some((apartment) => String(apartment.code) === String(activeApartmentCode))
    if (!exists) {
      setActiveApartmentCode(null)
      setAptData(null)
    }
  }, [buildingApartments, activeApartmentCode])

  const handleSelectBuilding = (buildingId: string) => {
    setSelectedBuildingId(buildingId)
    setBuildingApartments([])
    setAptData(null)
    setActiveApartmentCode(null)
  }

  const handleSelectApartment = async (apartmentCode: string) => {
    await loadApartmentDetail(apartmentCode)
  }

  const buildingSelectOptions = buildings.map((building) => ({
    value: String(building.id),
    label: `${building.name || 'Tòa nhà'}${building.code ? ` (${building.code})` : ''}`,
  }))

  const apartmentSelectOptions = buildingApartments.map((apartment) => ({
    value: String(apartment.code),
    label: `${apartment.code}${apartment.ownerName ? ` - ${apartment.ownerName}` : ''}`,
  }))

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space orientation="vertical" size={10} style={{ width: '100%' }}>
          <Space wrap size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap size={12}>
              <Select
                style={{ minWidth: 250 }}
                placeholder="Chọn tòa nhà"
                loading={loadingSelector}
                value={selectedBuildingId || undefined}
                options={buildingSelectOptions}
                onChange={handleSelectBuilding}
              />

              <Select
                style={{ minWidth: 280 }}
                placeholder="Chọn căn hộ"
                value={activeApartmentCode || undefined}
                options={apartmentSelectOptions}
                onChange={(value) => void handleSelectApartment(value)}
                disabled={!selectedBuildingId || apartmentSelectOptions.length === 0}
              />
            </Space>

            <Button onClick={() => navigate('/admin/quan-ly-toa-nha')}>Mở quản lý tòa nhà</Button>
          </Space>

          {!aptData && (
            <>
              <Text strong>Chọn tòa nhà và căn hộ để xem chi tiết</Text>
              <Text type="secondary">
                Bạn có thể vào trực tiếp từ menu này và chọn nhanh căn hộ cần quản lý mà không cần quay lại Dashboard.
              </Text>
            </>
          )}

          {aptData && activeApartmentCode && (
            <Text type="secondary">Đang xem căn hộ {activeApartmentCode}. Bạn có thể đổi căn hộ ngay trên thanh chọn.</Text>
          )}

          {selectorError && <Alert type="warning" showIcon message={selectorError} />}

          {!aptData && (loadingApartment ? <Spin /> : <Empty description="Vui lòng chọn tòa nhà và căn hộ để xem chi tiết." />)}
        </Space>
      </Card>

      <div style={{ marginTop: 18 }}>
        <ApartmentDetail apartment={aptData} onApartmentReload={reloadApartmentDetail} />
      </div>
    </div>
  )
}

export default ApartmentManagement
