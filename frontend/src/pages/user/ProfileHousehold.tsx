import { useCallback, useEffect, useState } from 'react'

import { Alert, message } from 'antd'

import api, { extractApiError } from '../../utils/api'

import type { HouseholdSummary } from '../../types/residentDashboard'

import type { MyHouseholdResident } from '../../types/householdProfile'

import type { Resident } from '../../types/api'

import {

  exportHouseholdProfilePdf,

  parseMyHouseholdResident,

} from '../../utils/householdProfile'

import {

  formatDobFromForm,

  normalizeGenderForApi,

  normalizeRelationshipForApi,

  sanitizeOptionalTextForApi,

} from '../../utils/residentApiPayload'

import ResidentModal from '../../components/ResidentModal'

import HouseholdOverviewHeaderCard from '../../components/resident/profile-household/HouseholdOverviewHeaderCard'


import HouseholdMembersCard from '../../components/resident/HouseholdMembersCard'

import HouseholdResidentDetailModal from '../../components/resident/HouseholdResidentDetailModal'

import '../../styles/resident-dashboard.css'

import '../../styles/profile-household-page.css'



const mapSummary = (data: unknown): HouseholdSummary | null => {

  if (!data || typeof data !== 'object') return null

  const s = data as Record<string, unknown>

  const num = (v: unknown) => {

    if (typeof v === 'number' && Number.isFinite(v)) return v

    if (typeof v === 'string') {

      const n = Number(v)

      return Number.isFinite(n) ? n : 0

    }

    return 0

  }

  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

  return {

    householdId: num(s.householdId) || undefined,

    apartmentCode: str(s.apartmentCode),

    buildingName: str(s.buildingName),

    floorNumber: num(s.floorNumber),

    area: num(s.area),

    apartmentStatus: str(s.apartmentStatus),

    memberCount: num(s.memberCount),

    ownerName: str(s.ownerName),

  }

}



const containsAny = (value: string, keywords: string[]) => keywords.some((k) => value.includes(k))



const saveErrorMessage = (error: unknown, fallback: string) => {

  const status = Number((error as { response?: { status?: number } })?.response?.status || 0)

  const raw = String(extractApiError(error, '') || '').toLowerCase()

  const isDuplicate =

    status === 409 || containsAny(raw, ['duplicate', 'already exists', 'unique constraint', 'constraint'])

  if (containsAny(raw, ['cccd', 'citizen']) && isDuplicate) return 'CCCD đã tồn tại trong hệ thống.'

  if (containsAny(raw, ['phone', 'dien thoai']) && isDuplicate) return 'Số điện thoại đã được sử dụng.'

  return extractApiError(error, fallback)

}



const toModalInitial = (r: MyHouseholdResident): Partial<Resident> => ({

  id: r.id,

  name: r.name,

  gender: r.gender,

  dob: r.dob,

  cccd: r.cccd,

  phone: r.phone,

  relationship: r.relationship,

  householdId: r.householdId,

})


const ProfileHousehold = () => {

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [summary, setSummary] = useState<HouseholdSummary | null>(null)

  const [residents, setResidents] = useState<MyHouseholdResident[]>([])

  const [detailResident, setDetailResident] = useState<MyHouseholdResident | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)

  const [editing, setEditing] = useState<MyHouseholdResident | null>(null)

  const [saving, setSaving] = useState(false)



  const loadData = useCallback(async () => {

    setLoading(true)

    setError(null)

    try {

      const [summaryRes, residentsRes] = await Promise.all([

        api.get('/households/me/summary'),

        api.get('/households/me/residents'),

      ])

      setSummary(mapSummary(summaryRes.data))

      const rows = Array.isArray(residentsRes.data) ? residentsRes.data : []

      setResidents(rows.map(parseMyHouseholdResident).filter((x): x is MyHouseholdResident => x != null))

    } catch (err) {

      setError(extractApiError(err, 'Không thể tải hồ sơ hộ khẩu.'))

      setSummary(null)

      setResidents([])

    } finally {

      setLoading(false)

    }

  }, [])



  useEffect(() => {

    void loadData()

  }, [loadData])



  const householdId = summary?.householdId ?? null



  const handleExportPdf = () => {

    if (!summary?.apartmentCode) {

      message.warning('Chưa có đủ thông tin căn hộ để xuất PDF.')

      return

    }

    try {

      exportHouseholdProfilePdf(summary, residents)

      message.success('Đã tạo file PDF.')

    } catch {

      message.error('Không thể xuất PDF. Vui lòng thử lại.')

    }

  }



  const handleSave = async (values: Partial<Resident>) => {

    if (!householdId) {

      message.error('Không xác định được hộ khẩu. Vui lòng tải lại trang.')

      return

    }



    const payload = {

      name: values.name,

      gender: normalizeGenderForApi(values.gender),

      dob: formatDobFromForm(values.dob),

      cccd: sanitizeOptionalTextForApi(values.cccd),

      phone: sanitizeOptionalTextForApi(values.phone),

      relationship: normalizeRelationshipForApi(values.relationship),

      householdId,

    }



    setSaving(true)

    try {

      if (editing?.id) {

        await api.put(`/households/me/residents/${editing.id}`, payload)

        message.success('Đã cập nhật thông tin cư dân.')

      } else {

        await api.post('/households/me/residents', payload)

        message.success('Đã thêm thành viên vào hộ khẩu.')

      }

      setEditorOpen(false)

      setEditing(null)

      await loadData()

    } catch (err) {

      message.error(saveErrorMessage(err, 'Không thể lưu. Vui lòng kiểm tra lại thông tin.'))

    } finally {

      setSaving(false)

    }

  }



  const openAddResident = () => {

    if (!householdId) {

      message.warning('Chưa có hộ khẩu gắn với tài khoản.')

      return

    }

    setEditing(null)

    setEditorOpen(true)

  }



  return (

    <div className="resident-page profile-household profile-household-page">




      <header className="ph-page-intro">

        <h1 className="ph-page-intro__title">HỒ SƠ CƯ DÂN</h1>

        <p className="ph-page-intro__sub">Xem thông tin căn hộ và thành viên trong hộ của bạn.</p>

      </header>



      {error && <Alert type="warning" showIcon message={error} className="profile-household__alert" />}



      <div className="ph-page-stack">

        <HouseholdOverviewHeaderCard loading={loading} summary={summary} />



        <HouseholdMembersCard

          loading={loading}

          residents={residents}

          onAdd={openAddResident}

          onExportPdf={handleExportPdf}

          onView={(r) => setDetailResident(r)}

          onEdit={(r) => {

            setEditing(r)

            setEditorOpen(true)

          }}

        />

      </div>



      <HouseholdResidentDetailModal

        open={detailResident != null}

        resident={detailResident}

        apartmentCode={summary?.apartmentCode}

        onEdit={(resident) => {
          setDetailResident(null)
          setEditing(resident)
          setEditorOpen(true)
        }}

        onClose={() => setDetailResident(null)}

      />



      <ResidentModal

        visible={editorOpen}

        onCancel={() => {

          setEditorOpen(false)

          setEditing(null)

        }}

        onSave={handleSave}

        initial={editing ? toModalInitial(editing) : null}

        householdId={householdId}

        loading={saving}

      />

    </div>

  )

}



export default ProfileHousehold

