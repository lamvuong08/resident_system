import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Key } from 'react'
import { Alert, Button, Card, DatePicker, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, EyeOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { approveMeterReadings, fetchBuildings, fetchMeterReadingApartments, rejectMeterReading } from '../../utils/meterReadingApi'
import type { ApartmentMeterReadingItem as Reading, BuildingOption, ReadingBatchResult, MeterService } from '../../utils/meterReadingApi'
import { readingActions, readingMoney, readingNumber, readingStatus } from '../../utils/electricityWorkflow'
import { extractApiError } from '../../utils/api'
import '../../styles/electricity-management.css'
import MeterReadingDetailModal from '../../components/MeterReadingDetailModal'

const { Title, Text } = Typography
interface Props { billingMonth?: string; onChanged?: () => void; onOpenBill?: (id: number) => void }
export default function ElectricityManagement({ billingMonth, onChanged, onOpenBill }: Props) {
  const [service, setService] = useState<MeterService | 'ALL'>('ALL')
  const serviceLabel = service === 'WATER' ? 'nước' : 'điện'
  const [search, setSearch] = useState('')
  const [staff, setStaff] = useState('')
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [buildingId, setBuilding] = useState<number>()
  const [floor, setFloor] = useState<number>()
  const [period, setPeriod] = useState<Dayjs>(dayjs())
  const [tab, setTab] = useState('PENDING_APPROVAL')
  const [rows, setRows] = useState<Reading[]>([])
  const [selected, setSelected] = useState<Key[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState<Reading | null>(null)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState<Reading | null>(null)
  const [report, setReport] = useState<ReadingBatchResult | null>(null)
  const loadSequence = useRef(0)
  const month = billingMonth || period.format('MM/YYYY')
  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true)
    try {
      const data = (await Promise.all((service === 'ALL' ? ['ELECTRICITY', 'WATER'] as MeterService[] : [service]).map(kind => fetchMeterReadingApartments({ service: kind, buildingId, floor, billingMonth: month })))).flat()
      if (sequence === loadSequence.current) { setRows(data.filter(row => row.readingId != null)); setSelected([]) }
    } catch (error) { if (sequence === loadSequence.current) message.error(extractApiError(error, `Không tải được chỉ số ${serviceLabel}`)) }
    finally { if (sequence === loadSequence.current) setLoading(false) }
  }, [buildingId, floor, month, service, serviceLabel])
  useEffect(() => { void fetchBuildings().then(setBuildings).catch(error => message.error(extractApiError(error, 'Không tải được tòa nhà'))) }, [])
  useEffect(() => { void reload(); return () => { loadSequence.current++ } }, [reload])
  const displayed = rows.filter(row => row.apartmentCode.toLowerCase().includes(search.trim().toLowerCase()) && (row.recordedBy || '').toLowerCase().includes(staff.trim().toLowerCase())).filter(row => tab === 'ISSUED' ? ['ISSUED', 'LEGACY_ISSUED'].includes(row.approvalStatus || '') : row.approvalStatus === tab)
  const detailView = useMemo(() => detail ? {...detail, amount:detail.calculatedAmount} : null, [detail])
  const chosen = displayed.filter(row => selected.includes(row.readingId!))
  const floors = useMemo(() => Array.from({ length: buildings.find(b => b.id === buildingId)?.totalFloors || 0 }, (_, index) => ({ value: index + 1, label: `Tầng ${index + 1}` })), [buildings, buildingId])
  const statusTag = (row: Reading) => {
    const status = readingStatus[row.approvalStatus || '']
    return <Tag color={status?.color}>{status?.label || 'Chưa ghi'}</Tag>
  }
  const approve = async () => {
    setBusy(true)
    try { setReport(await approveMeterReadings(readingActions(chosen))); await reload(); onChanged?.() }
    catch (error) { message.error(extractApiError(error, 'Không duyệt được chỉ số')) }
    finally { setBusy(false) }
  }
  const reject = async () => {
    if (!rejecting || !reason.trim()) return
    setBusy(true)
    try {
      await rejectMeterReading(rejecting.readingId!, rejecting.version!, reason.trim())
      setRejecting(null); setReason(''); message.success('Đã từ chối và lưu lý do cho nhân viên'); await reload(); onChanged?.()
    } catch (error) { message.error(extractApiError(error, 'Không từ chối được chỉ số')) }
    finally { setBusy(false) }
  }
  const columns: ColumnsType<Reading> = [
    { title: 'Dịch vụ', width: 80, render: (_, row) => row.meterService === 'WATER' ? 'Nước' : 'Điện' },
    { title: 'Căn hộ', dataIndex: 'apartmentCode', fixed: 'left', width: 120, render: value => <Text strong>{value}</Text> },
    { title: 'Tòa / Tầng', width: 150, render: (_, row) => `${row.buildingCode || row.buildingName} / ${row.floorNumber ?? '—'}` },
    { title: 'Nhân viên ghi', dataIndex: 'recordedBy', width: 170, render: value => value || 'Lịch sử trước chuyển đổi' },
    { title: 'Chỉ số cũ', dataIndex: 'oldReading', align: 'right', width: 115, render: readingNumber },
    { title: 'Chỉ số mới', dataIndex: 'newReading', align: 'right', width: 115, render: readingNumber },
    { title: 'Tiêu thụ', dataIndex: 'usageAmount', align: 'right', width: 125, render: (value, row) => `${readingNumber(value)} ${row.meterService === 'WATER' ? 'm³' : 'kWh'}` },
    { title: 'Tiền dự kiến', dataIndex: 'calculatedAmount', align: 'right', width: 150, render: readingMoney },
    { title: 'Trạng thái', width: 180, render: (_, row) => <Space orientation="vertical" size={2}>{statusTag(row)}{row.rejectionReason && <Text type="danger">{row.rejectionReason}</Text>}</Space> },
    { title: 'Thao tác', fixed: 'right', width: 170, render: (_, row) => <Space>
      <Button aria-label={`Chi tiết ${row.apartmentCode}`} icon={<EyeOutlined />} onClick={() => setDetail(row)} />
      {['PENDING_APPROVAL', 'APPROVED'].includes(row.approvalStatus || '') && <Button danger disabled={busy} onClick={() => { setRejecting(row); setReason('') }}>Từ chối</Button>}
      {row.linkedBillId && <Button type="link" onClick={() => onOpenBill?.(row.linkedBillId!)}>#{row.linkedBillId}</Button>}
    </Space> },
  ]
  return <div className="electricity-management">
    <div className="electricity-heading"><div><Title level={3}><ThunderboltOutlined /> Duyệt chỉ số điện, nước</Title><Text type="secondary">Duyệt chỉ số để cập nhật hóa đơn nháp. Phát hành toàn bộ hóa đơn tại tab Quản lý hóa đơn.</Text></div>
      <Button icon={<ReloadOutlined />} loading={loading} disabled={busy} onClick={() => void reload()}>Làm mới</Button></div>
    <Card className="electricity-filters"><Space wrap>
      {!billingMonth && <DatePicker picker="month" allowClear={false} value={period} format="MM/YYYY" disabled={busy} onChange={value => { if (value) setPeriod(value) }} />}
      <Select aria-label="Tòa nhà" placeholder="Tất cả tòa nhà" allowClear value={buildingId} disabled={busy} style={{ width: 200 }} options={buildings.map(b => ({ value: b.id, label: b.name }))} onChange={value => { setBuilding(value); setFloor(undefined) }} />
      <Select aria-label="Tầng" placeholder="Tất cả tầng" allowClear value={floor} disabled={!buildingId || busy} options={floors} style={{ width: 150 }} onChange={setFloor} />
      <Select aria-label="Dịch vụ" value={service} onChange={setService} options={[{value:'ALL',label:'Tất cả dịch vụ'},{value:'ELECTRICITY',label:'Điện'},{value:'WATER',label:'Nước'}]} />
      <Input placeholder="Mã căn hộ" value={search} onChange={event => setSearch(event.target.value)} style={{width:150}} />
      <Input placeholder="Nhân viên ghi" value={staff} onChange={event => setStaff(event.target.value)} style={{width:170}} />
    </Space></Card>
    <Card>
      <Tabs activeKey={tab} onChange={value => { setTab(value); setSelected([]) }} items={['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ISSUED', 'LEGACY_REVIEW'].map(key => ({ key, label: readingStatus[key].label }))} />
      <div className="electricity-actions"><Text>{displayed.length} bản ghi · Đã chọn {chosen.length}</Text><Space>
        {tab === 'PENDING_APPROVAL' && <Button type="primary" icon={<CheckOutlined />} disabled={!chosen.length || chosen.length > 200 || loading} loading={busy} onClick={() => void approve()}>Duyệt {chosen.length ? `(${chosen.length})` : 'đã chọn'}</Button>}
      </Space></div>
      <Table<Reading> rowKey="readingId" columns={columns} dataSource={displayed} loading={loading} scroll={{ x: 1450 }} pagination={{ pageSize: 15, showSizeChanger: true }}
        rowSelection={['PENDING_APPROVAL', 'APPROVED'].includes(tab) ? { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: row => ({ disabled: busy || row.version == null }) } : undefined} />
    </Card>
    <Modal title={`Từ chối chỉ số ${serviceLabel}`} open={!!rejecting} onCancel={() => { if (!busy) setRejecting(null) }} onOk={() => void reject()} confirmLoading={busy} okButtonProps={{ disabled: !reason.trim() }} okText="Lưu lý do từ chối" cancelText="Hủy">
      <Text>Căn hộ {rejecting?.apartmentCode} · Nhân viên sẽ nhìn thấy lý do để kiểm tra và gửi lại.</Text>
      <Input.TextArea aria-label="Lý do từ chối" value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} showCount rows={4} style={{ marginTop: 16 }} />
    </Modal>
    <MeterReadingDetailModal reading={detailView} onClose={() => setDetail(null)} />
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
