import { useEffect, useState } from 'react'
import { Alert, Button, Collapse, Descriptions, Empty, Modal, Spin, Table, Tag, Timeline } from 'antd'
import dayjs from 'dayjs'
import { fetchReadingHistory } from '../utils/meterReadingApi'
import type { MeterService, ReadingAudit } from '../utils/meterReadingApi'
import { readingMoney, readingNumber, readingStatus } from '../utils/electricityWorkflow'
import { extractApiError } from '../utils/api'
import { parseTariffSnapshot } from '../utils/tariffPresentation'
import '../styles/billing-detail-modals.css'

export interface ReadingDetail {
  readingId: number | null
  apartmentCode: string
  billingMonth: string
  meterService?: MeterService
  approvalStatus?: string | null
  oldReading: number | null
  newReading: number | null
  usageAmount: number | null
  amount: number | null
  tariffSnapshot?: string | null
  recordedBy?: string | null
  recordedAt?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  rejectionReason?: string | null
}
const date = (value?: string | null) => value && dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY · HH:mm') : '—'
const actions: Record<string, {label: string; color: string}> = {
  SUBMITTED: {label:'Đã gửi duyệt',color:'blue'}, APPROVED:{label:'Đã phê duyệt',color:'green'},
  REJECTED:{label:'Đã từ chối',color:'red'}, ISSUED:{label:'Đã phát hành hóa đơn',color:'blue'},
}
export default function MeterReadingDetailModal({ reading, onClose }: { reading: ReadingDetail | null; onClose: () => void }) {
  const [history, setHistory] = useState<ReadingAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const id = reading?.readingId
  useEffect(() => {
    let active = true
    async function load() {
      setHistory([]); setError('')
      if (id == null) {setLoading(false);return}
      setLoading(true)
      try {const data = await fetchReadingHistory(id);if(active)setHistory(data)}
      catch(cause) {if(active)setError(extractApiError(cause,'Không tải được lịch sử xử lý'))}
      finally {if(active)setLoading(false)}
    }
    if(reading) void load()
    return () => {active=false}
  }, [id, retry, reading])
  const water = reading?.meterService === 'WATER'
  const unit = water ? 'm³' : 'kWh'
  const status = readingStatus[reading?.approvalStatus || '']
  const tariff = parseTariffSnapshot(reading?.tariffSnapshot)
  return <Modal open={!!reading} onCancel={onClose} width={860} wrapClassName="billing-detail-modal meter-detail-modal"
    title={<div className="detail-heading"><div><span className="detail-title">Chi tiết chỉ số {water?'nước':'điện'}</span><p>Căn hộ {reading?.apartmentCode} · Kỳ {reading?.billingMonth}</p></div><Tag color={status?.color}>{status?.label || (reading?.approvalStatus || 'Đã liên kết hóa đơn')}</Tag></div>}
    footer={<Button onClick={onClose}>Đóng</Button>}>
    {reading && <div className="detail-sections">
      <div className="detail-overview">
        <div><span className="detail-label">{water?'Lượng nước tiêu thụ':'Điện năng tiêu thụ'}</span><div className="detail-value">{readingNumber(reading.usageAmount)} <small>{unit}</small></div><p className="detail-comparison">Chỉ số cũ: <strong>{readingNumber(reading.oldReading)}</strong><span>→</span>Chỉ số mới: <strong>{readingNumber(reading.newReading)}</strong></p></div>
        <div><span className="detail-label">Thành tiền</span><div className="detail-value">{reading.amount == null?'—':readingMoney(reading.amount)}</div><p className="detail-muted">Số tiền theo bản ghi của hệ thống</p></div>
      </div>
      <Collapse className="detail-calculation" items={[{key:'tariff',label:'Chi tiết cách tính',children:<>
        {tariff ? <>{tariff.effective && <p className="detail-muted">Hiệu lực: {tariff.effective}</p>}<Table size="small" pagination={false} rowKey="key" dataSource={tariff.tiers} scroll={{x:420}} columns={[
          {title:'Bậc',dataIndex:'key',render:value=>`Bậc ${value}`},
          {title:'Khoảng tiêu thụ',render:(_,row)=>`${readingNumber(row.min)} – ${row.max==null?'∞':readingNumber(row.max)} ${row.unit}`},
          {title:'Đơn giá',align:'right',render:(_,row)=>`${readingMoney(row.price)}/${row.unit}`},
        ]} /><p className="detail-muted">Biểu giá đã lưu cùng bản ghi chưa có phân bổ lượng và thành tiền từng bậc. Tổng tiền giữ nguyên theo bản ghi đã lưu.</p></>
          : reading.tariffSnapshot ? <><p className="detail-muted">Mô tả biểu giá được lưu cùng bản ghi:</p><p className="detail-snapshot">{reading.tariffSnapshot}</p></> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có biểu giá lưu cho bản ghi này" />}
      </> }]} />
      <section><h3>Thông tin ghi chỉ số</h3><Descriptions column={{xs:1,sm:2,md:2,lg:2,xl:2,xxl:2}} size="small" items={[
        {key:'staff',label:'Nhân viên ghi',children:reading.recordedBy||'Không có dữ liệu lịch sử'},
        {key:'recorded',label:'Lần ghi gần nhất',children:date(reading.recordedAt)},
        {key:'id',label:'Mã bản ghi',children:reading.readingId==null?'Chưa liên kết':`#${reading.readingId}`},
      ]} /></section>
      {(reading.approvedBy || reading.approvedAt || reading.rejectionReason) && <section><h3>Thông tin phê duyệt</h3><Descriptions column={{xs:1,sm:2,md:2,lg:2,xl:2,xxl:2}} size="small" items={[
        ...(reading.approvedBy || reading.approvedAt ? [{key:'approver',label:'Người duyệt',children:reading.approvedBy||'—'},{key:'approvedAt',label:'Thời điểm duyệt',children:date(reading.approvedAt)}] : []),
      ]} />{reading.rejectionReason && <Alert showIcon type="error" title="Lý do từ chối" description={reading.rejectionReason} />}</section>}
      <section><h3>Lịch sử xử lý</h3>
        {loading ? <div className="detail-loading"><Spin tip="Đang tải lịch sử" /></div> : error ? <Alert type="error" showIcon title={error} action={<Button size="small" onClick={()=>setRetry(value=>value+1)}>Thử lại</Button>} />
          : !history.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch sử xử lý" />
          : <Timeline items={history.map(event=>({key:event.id,color:actions[event.action]?.color||'gray',content:<div className="detail-history-event"><div><strong>{actions[event.action]?.label||event.action}</strong><time>{date(event.createdAt)}</time></div><p>{event.actor||'Không có thông tin người thực hiện'}</p>{event.reason && <p className="detail-reason">{event.reason}</p>}<details><summary>Dữ liệu ghi nhận</summary><p>Chỉ số: {readingNumber(event.oldReading)} → {readingNumber(event.newReading)} {unit} · Thành tiền: {event.estimatedAmount==null?'—':readingMoney(event.estimatedAmount)}</p>{event.billDetailId && <p>Mã khoản phí: #{event.billDetailId}</p>}{event.tariffSnapshot && <p className="detail-snapshot">{event.tariffSnapshot}</p>}</details></div>}))} />}
      </section>
    </div>}
  </Modal>
}
