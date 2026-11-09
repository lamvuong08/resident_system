import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Key } from 'react'
import { Alert, Button, Card, DatePicker, Descriptions, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, EyeOutlined, ReloadOutlined, SendOutlined, ThunderboltOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { approveMeterReadings, fetchBuildings, fetchMeterReadingApartments, fetchReadingHistory, issueMeterReadings, rejectMeterReading } from '../../utils/meterReadingApi'
import type { ApartmentMeterReadingItem as Reading, BuildingOption, ReadingAudit, ReadingBatchResult } from '../../utils/meterReadingApi'
import { canSelectForIssue, readingActions, readingMoney, readingNumber, readingStatus } from '../../utils/electricityWorkflow'
import { extractApiError } from '../../utils/api'
import '../../styles/electricity-management.css'

const { Title, Text } = Typography
const date = (value: string | null) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—'
export default function ElectricityManagement() {
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [buildingId, setBuilding] = useState<number>()
  const [floor, setFloor] = useState<number>()
  const [period, setPeriod] = useState<Dayjs>(dayjs())
  const [tab, setTab] = useState('PENDING_APPROVAL')
  const [rows, setRows] = useState<Reading[]>([])
  const [selected, setSelected] = useState<Key[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Reading[] | null>(null)
  const [previewSelected, setPreviewSelected] = useState<Key[]>([])
  const [due, setDue] = useState<Dayjs | null>(dayjs().add(15, 'day'))
  const [rejecting, setRejecting] = useState<Reading | null>(null)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState<Reading | null>(null)
  const [history, setHistory] = useState<ReadingAudit[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [report, setReport] = useState<ReadingBatchResult | null>(null)
  const loadSequence = useRef(0)
  const month = period.format('MM/YYYY')
  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true)
    try {
      const data = await fetchMeterReadingApartments({ buildingId, floor, billingMonth: month })
      if (sequence === loadSequence.current) { setRows(data.filter(row => row.readingId != null)); setSelected([]) }
    } catch (error) { if (sequence === loadSequence.current) message.error(extractApiError(error, 'Không tải được chỉ số điện')) }
    finally { if (sequence === loadSequence.current) setLoading(false) }
  }, [buildingId, floor, month])
  useEffect(() => { void fetchBuildings().then(setBuildings).catch(error => message.error(extractApiError(error, 'Không tải được tòa nhà'))) }, [])
  useEffect(() => { void reload(); return () => { loadSequence.current++ } }, [reload])
  const displayed = rows.filter(row => tab === 'ISSUED' ? ['ISSUED', 'LEGACY_ISSUED'].includes(row.approvalStatus || '') : row.approvalStatus === tab)
  const chosen = displayed.filter(row => selected.includes(row.readingId!))
  const previewRows = preview?.filter(row => previewSelected.includes(row.readingId!)) ?? []
  const previewTotal = previewRows.reduce((sum, row) => sum + row.calculatedAmount, 0)
  const floors = useMemo(() => Array.from({ length: buildings.find(b => b.id === buildingId)?.totalFloors || 0 }, (_, index) => ({ value: index + 1, label: `Tầng ${index + 1}` })), [buildings, buildingId])
  const statusTag = (row: Reading) => {
    const status = readingStatus[row.approvalStatus || '']
    return <Tag color={status?.color}>{status?.label || 'Chưa ghi'}</Tag>
  }
  const openDetail = async (row: Reading) => {
    setDetail(row); setHistory([]); setHistoryLoading(true)
    try { setHistory(await fetchReadingHistory(row.readingId!)) }
    catch (error) { message.error(extractApiError(error, 'Không tải được lịch sử')) }
    finally { setHistoryLoading(false) }
  }
  const approve = async () => {
    setBusy(true)
    try { setReport(await approveMeterReadings(readingActions(chosen))); await reload() }
    catch (error) { message.error(extractApiError(error, 'Không duyệt được chỉ số')) }
    finally { setBusy(false) }
  }
  const openPreview = () => {
    const approved = rows.filter(row => row.approvalStatus === 'APPROVED')
    setPreview(approved.map(row => ({ ...row })))
    setPreviewSelected(approved.filter(row => canSelectForIssue(row) && (!selected.length || selected.includes(row.readingId!))).map(row => row.readingId!))
  }
  const issue = async () => {
    if (!due || !previewRows.length || due.isBefore(dayjs(), 'day')) return
    setBusy(true)
    try {
      const result = await issueMeterReadings(readingActions(previewRows), due.format('YYYY-MM-DD'))
      setPreview(null); setReport(result); await reload()
    } catch (error) { message.error(extractApiError(error, 'Không phát hành được hóa đơn')) }
    finally { setBusy(false) }
  }
  const reject = async () => {
    if (!rejecting || !reason.trim()) return
    setBusy(true)
    try {
      await rejectMeterReading(rejecting.readingId!, rejecting.version!, reason.trim())
      setRejecting(null); setReason(''); message.success('Đã từ chối và lưu lý do cho nhân viên'); await reload()
    } catch (error) { message.error(extractApiError(error, 'Không từ chối được chỉ số')) }
    finally { setBusy(false) }
  }
  const columns: ColumnsType<Reading> = [
    { title: 'Căn hộ', dataIndex: 'apartmentCode', fixed: 'left', width: 120, render: value => <Text strong>{value}</Text> },
    { title: 'Tòa / Tầng', width: 150, render: (_, row) => `${row.buildingCode || row.buildingName} / ${row.floorNumber ?? '—'}` },
    { title: 'Nhân viên ghi', dataIndex: 'recordedBy', width: 170, render: value => value || 'Lịch sử trước chuyển đổi' },
    { title: 'Chỉ số cũ', dataIndex: 'oldReading', align: 'right', width: 115, render: readingNumber },
    { title: 'Chỉ số mới', dataIndex: 'newReading', align: 'right', width: 115, render: readingNumber },
    { title: 'Tiêu thụ', dataIndex: 'usageAmount', align: 'right', width: 125, render: value => `${readingNumber(value)} kWh` },
    { title: 'Tiền dự kiến', dataIndex: 'calculatedAmount', align: 'right', width: 150, render: readingMoney },
    { title: 'Trạng thái', width: 180, render: (_, row) => <Space orientation="vertical" size={2}>{statusTag(row)}{row.rejectionReason && <Text type="danger">{row.rejectionReason}</Text>}</Space> },
    { title: 'Thao tác', fixed: 'right', width: 170, render: (_, row) => <Space>
      <Button aria-label={`Chi tiết ${row.apartmentCode}`} icon={<EyeOutlined />} onClick={() => void openDetail(row)} />
      {['PENDING_APPROVAL', 'APPROVED'].includes(row.approvalStatus || '') && <Button danger disabled={busy} onClick={() => { setRejecting(row); setReason('') }}>Từ chối</Button>}
    </Space> },
  ]
  const previewColumns: ColumnsType<Reading> = [
    columns[0], columns[3], columns[4], columns[5],
    { title: 'Thành tiền', dataIndex: 'calculatedAmount', align: 'right', render: value => <Text strong>{readingMoney(value)}</Text> },
    { title: 'Trạng thái', render: (_, row) => <Space orientation="vertical" size={2}>{statusTag(row)}{!row.eligibleForIssue && <Text type="danger">{row.issueBlockedReason}</Text>}</Space> },
  ]
  return <div className="electricity-management">
    <div className="electricity-heading"><div><Title level={3}><ThunderboltOutlined /> Quản lý điện</Title><Text type="secondary">Kiểm tra chỉ số nhân viên đã ghi, duyệt và phát hành khoản điện cho cư dân.</Text></div>
      <Button icon={<ReloadOutlined />} loading={loading} disabled={busy} onClick={() => void reload()}>Làm mới</Button></div>
    <Card className="electricity-filters"><Space wrap>
      <DatePicker picker="month" allowClear={false} value={period} format="MM/YYYY" disabled={busy} onChange={value => { if (value) setPeriod(value) }} />
      <Select aria-label="Tòa nhà" placeholder="Tất cả tòa nhà" allowClear value={buildingId} disabled={busy} style={{ width: 200 }} options={buildings.map(b => ({ value: b.id, label: b.name }))} onChange={value => { setBuilding(value); setFloor(undefined) }} />
      <Select aria-label="Tầng" placeholder="Tất cả tầng" allowClear value={floor} disabled={!buildingId || busy} options={floors} style={{ width: 150 }} onChange={setFloor} />
    </Space></Card>
    <Card>
      <Tabs activeKey={tab} onChange={value => { setTab(value); setSelected([]) }} items={['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ISSUED', 'LEGACY_REVIEW'].map(key => ({ key, label: readingStatus[key].label }))} />
      <div className="electricity-actions"><Text>{displayed.length} bản ghi · Đã chọn {chosen.length}</Text><Space>
        {tab === 'PENDING_APPROVAL' && <Button type="primary" icon={<CheckOutlined />} disabled={!chosen.length || chosen.length > 200 || loading} loading={busy} onClick={() => void approve()}>Duyệt {chosen.length ? `(${chosen.length})` : 'đã chọn'}</Button>}
        {tab === 'APPROVED' && <Button type="primary" icon={<SendOutlined />} disabled={!displayed.length || loading} loading={busy} onClick={openPreview}>Xem trước phát hành</Button>}
      </Space></div>
      <Table<Reading> rowKey="readingId" columns={columns} dataSource={displayed} loading={loading} scroll={{ x: 1450 }} pagination={{ pageSize: 15, showSizeChanger: true }}
        rowSelection={['PENDING_APPROVAL', 'APPROVED'].includes(tab) ? { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: row => ({ disabled: busy || row.version == null }) } : undefined} />
    </Card>
    <Modal title={`Xem trước hóa đơn tiền điện · ${month}`} open={preview !== null} width={1100} closable={!busy} maskClosable={false} onCancel={() => { if (!busy) setPreview(null) }} footer={[
      <Button key="cancel" disabled={busy} onClick={() => setPreview(null)}>Quay lại</Button>,
      <Button key="issue" type="primary" icon={<SendOutlined />} loading={busy} disabled={!previewRows.length || previewRows.length > 200 || !due || due.isBefore(dayjs(), 'day')} onClick={() => void issue()}>Phát hành {previewRows.length} hóa đơn</Button>,
    ]}>
      <Alert type="info" showIcon title="Chỉ phát hành các căn hộ đã duyệt và đủ điều kiện" description="Số liệu và thành tiền lấy từ bản ghi đã duyệt, theo biểu giá cấu hình. Chọn tối đa 200 căn hộ mỗi lần, kiểm tra hạn thanh toán rồi phát hành." />
      <div className="electricity-actions"><Space><Text strong>Hạn thanh toán</Text><DatePicker aria-label="Hạn thanh toán" value={due} allowClear format="DD/MM/YYYY" disabled={busy} disabledDate={value => value.isBefore(dayjs(), 'day')} onChange={setDue} /></Space>
        <Text strong>Tổng đã chọn: {readingMoney(previewTotal)}</Text></div>
      <Table<Reading> rowKey="readingId" columns={previewColumns} dataSource={preview || []} pagination={{ pageSize: 10 }} scroll={{ x: 850 }}
        rowSelection={{ selectedRowKeys: previewSelected, onChange: setPreviewSelected, getCheckboxProps: row => ({ disabled: busy || !canSelectForIssue(row) }) }} />
    </Modal>
    <Modal title="Từ chối chỉ số điện" open={!!rejecting} onCancel={() => { if (!busy) setRejecting(null) }} onOk={() => void reject()} confirmLoading={busy} okButtonProps={{ disabled: !reason.trim() }} okText="Lưu lý do từ chối" cancelText="Hủy">
      <Text>Căn hộ {rejecting?.apartmentCode} · Nhân viên sẽ nhìn thấy lý do để kiểm tra và gửi lại.</Text>
      <Input.TextArea aria-label="Lý do từ chối" value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} showCount rows={4} style={{ marginTop: 16 }} />
    </Modal>
    <Modal title={`Chi tiết chỉ số · ${detail?.apartmentCode || ''}`} open={!!detail} onCancel={() => setDetail(null)} width={900} footer={<Button onClick={() => setDetail(null)}>Đóng</Button>}>
      {detail && <><Descriptions bordered column={2} items={[
        { key: 'period', label: 'Kỳ điện', children: detail.billingMonth }, { key: 'status', label: 'Trạng thái', children: statusTag(detail) },
        { key: 'staff', label: 'Nhân viên ghi', children: detail.recordedBy || 'Không có dữ liệu lịch sử' }, { key: 'time', label: 'Lần ghi gần nhất', children: date(detail.recordedAt) },
        { key: 'old', label: 'Chỉ số cũ', children: readingNumber(detail.oldReading) }, { key: 'new', label: 'Chỉ số mới', children: readingNumber(detail.newReading) },
        { key: 'usage', label: 'Tiêu thụ', children: `${readingNumber(detail.usageAmount)} kWh` }, { key: 'money', label: 'Thành tiền', children: readingMoney(detail.calculatedAmount) },
        { key: 'tariff', label: 'Biểu giá áp dụng', span: 2, children: detail.tariffSnapshot || 'Chưa có snapshot biểu giá lịch sử' },
        { key: 'approved', label: 'Người duyệt', children: detail.approvedBy || '—' }, { key: 'approvedAt', label: 'Thời điểm duyệt', children: date(detail.approvedAt) },
      ]} /><Title level={5}>Lịch sử kiểm tra và phát hành</Title><Table<ReadingAudit> rowKey="id" dataSource={history} loading={historyLoading} size="small" pagination={false} scroll={{ x: 700 }} columns={[
        { title: 'Thời gian', dataIndex: 'createdAt', render: date }, { title: 'Thao tác', dataIndex: 'action' }, { title: 'Người thực hiện', dataIndex: 'actor' },
        { title: 'Chỉ số mới', dataIndex: 'newReading', render: readingNumber }, { title: 'Thành tiền', dataIndex: 'estimatedAmount', render: readingMoney }, { title: 'Lý do', dataIndex: 'reason' },
      ]} /></>}
    </Modal>
    <Modal title="Kết quả xử lý hàng loạt" open={!!report} width={850} onCancel={() => setReport(null)} footer={<Button type="primary" onClick={() => setReport(null)}>Đóng</Button>}>
      {report && <><Alert showIcon type={report.failed ? 'warning' : 'success'} title={`Thành công: ${report.succeeded} · Thất bại: ${report.failed}`} description="Các căn hộ thành công được lưu riêng. Kiểm tra lý do của dòng thất bại trước khi thử lại." />
        <Table rowKey="id" dataSource={report.results} size="small" style={{ marginTop: 16 }} pagination={{ pageSize: 10 }} columns={[
          { title: 'Căn hộ', dataIndex: 'id', render: id => rows.find(row => row.readingId === id)?.apartmentCode || `Bản ghi #${id}` },
          { title: 'Kết quả', dataIndex: 'success', render: value => <Tag color={value ? 'green' : 'red'}>{value ? 'Thành công' : 'Thất bại'}</Tag> },
          { title: 'Chi tiết', dataIndex: 'message' }, { title: 'Mã hóa đơn', dataIndex: 'billId', render: value => value ? `#${value}` : '—' },
        ]} /></>}
    </Modal>
  </div>
}
