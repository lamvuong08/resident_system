import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Empty, Input, Modal, Select, Skeleton, Space, Table, Typography, message } from 'antd'
import { assignRequest, fetchAssignableStaff, getAdminRequestTypeLabel, reassignRequest,
  type AdminRequestRow, type AssignableStaff } from '../utils/adminSupportApi'
import { formatUserRequestDate } from '../utils/userSupportApi'
import { extractApiError } from '../utils/api'

type Props = { open: boolean; request: AdminRequestRow | null; transfer: boolean; revision: number; onCancel: () => void; onDone: () => void }

export default function RequestAssignmentModal({ open, request, transfer, revision, onCancel, onDone }: Props) {
  const [staff, setStaff] = useState<AssignableStaff[]>([])
  const [staffId, setStaffId] = useState<number>()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const submitting = useRef(false)

  useEffect(() => {
    if (open) { setStaffId(undefined); setReason(''); setError('') }
  }, [open, request?.id, transfer])

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    void fetchAssignableStaff().then((rows) => { if (active) setStaff(rows) })
      .catch((err) => { if (active) setError(extractApiError(err, 'Không thể tải khối lượng công việc của nhân viên.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, request?.id, revision, reload])

  const available = staff.filter((item) => !transfer || item.id !== request?.assignedStaff?.id)
  const selected = available.find((item) => item.id === staffId)
  const submit = async () => {
    if (!request || !selected || submitting.current || loading || error || (transfer && !reason.trim())) return
    submitting.current = true
    setSaving(true)
    try {
      if (transfer) {
        if (!request.assignedStaff) return
        await reassignRequest(request.id, selected.id, reason.trim(), request.assignedStaff.id)
      } else {
        await assignRequest(request.id, selected.id)
      }
      message.success(transfer ? 'Đã chuyển giao công việc' : 'Đã phân công công việc')
      onDone()
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      message.error(extractApiError(err, status === 409
        ? 'Yêu cầu hoặc người phụ trách đã thay đổi. Danh sách sẽ được tải lại.'
        : 'Không thể phân công. Vui lòng tải lại trạng thái yêu cầu.'))
      if (status === 409 || status === 403 || status === 404) onDone()
      else setReload((value) => value + 1)
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return <Modal title={transfer ? 'Chuyển giao công việc' : 'Phân công xử lý yêu cầu'} open={open}
    onCancel={() => { if (!submitting.current) onCancel() }} onOk={() => void submit()} width={720}
    confirmLoading={saving} okText={transfer ? 'Xác nhận chuyển giao' : 'Xác nhận phân công'} cancelText="Hủy"
    okButtonProps={{ className: 'fix-height-32', disabled: saving || !selected || loading || Boolean(error) || (transfer && !reason.trim()) }}
    cancelButtonProps={{ className: 'fix-height-32', disabled: saving }} closable={!saving} maskClosable={!saving}>
    {request && <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div>
        <Typography.Text strong>Yêu cầu #{request.id} · {getAdminRequestTypeLabel(request.type)}</Typography.Text>
        <div>Căn hộ: {request.resident.apartment} · Gửi lúc: {formatUserRequestDate(request.createdAt)}</div>
        {transfer && <div>Nhân viên hiện tại: <strong>{request.assignedStaff?.name}</strong></div>}
      </div>
      <Typography.Text type="secondary">Chưa hoàn thành gồm việc được giao đang chờ bắt đầu và việc đang xử lý. Danh sách ưu tiên người ít việc hơn.</Typography.Text>
      {error && <Alert type="error" title={error} action={<Button onClick={() => setReload((value) => value + 1)}>Thử lại</Button>} />}
      {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : <>
        <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Chọn nhân viên phụ trách"
          value={selected?.id} onChange={setStaffId} disabled={saving || Boolean(error)}
          options={available.map((item) => ({ value: item.id, label: `${item.name} — ${item.unfinishedCount} công việc chưa hoàn thành` }))} />
        {staff.length === 0 && !error ? <Empty description="Chưa có STAFF đang hoạt động" /> : <Table<AssignableStaff>
          size="small" rowKey="id" dataSource={staff} pagination={false} scroll={{ y: 240 }}
          rowSelection={{ type: 'radio', selectedRowKeys: selected ? [selected.id] : [],
            onChange: (keys) => setStaffId(Number(keys[0])),
            getCheckboxProps: (item) => ({ disabled: saving || Boolean(error) || (transfer && item.id === request.assignedStaff?.id) }) }}
          columns={[
            { title: 'Nhân viên', dataIndex: 'name' },
            { title: 'Chờ bắt đầu', dataIndex: 'assignedCount', width: 110 },
            { title: 'Đang xử lý', dataIndex: 'processingCount', width: 110 },
            { title: 'Chưa hoàn thành', dataIndex: 'unfinishedCount', width: 140, render: (count: number) => <strong>{count}</strong> },
          ]} />}
        {selected && <Alert type="info" title={`${selected.name} hiện có ${selected.unfinishedCount} công việc chưa hoàn thành.`} />}
      </>}
      {transfer && <div>
        <Typography.Text strong>Lý do chuyển giao *</Typography.Text>
        <Input.TextArea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000}
          showCount rows={3} disabled={saving} placeholder="Nhập lý do chuyển giao công việc" />
      </div>}
    </Space>}
  </Modal>
}
