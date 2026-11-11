import { Alert, Button, Descriptions, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { AdminBillDetailInfo, AdminBillFullResponse } from '../pages/admin/AdminPaymentManagement'
import { readingMoney, readingNumber } from '../utils/electricityWorkflow'
import type { ReadingDetail } from './MeterReadingDetailModal'
import '../styles/billing-detail-modals.css'

const date = (value: string | null) => value && dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : '—'
const method = (value: string | null) => ({CASH:'Tiền mặt',BANK_TRANSFER:'Chuyển khoản',TRANSFER:'Chuyển khoản',MOMO:'MoMo',ZALOPAY:'ZaloPay'}[value || ''] || value || '—')
export default function InvoiceDetailContent({bill,onEdit,onViewReading}: {
  bill: AdminBillFullResponse
  onEdit: (detail: AdminBillDetailInfo) => void
  onViewReading: (reading: ReadingDetail) => void
}) {
  // Keep the existing edit conditions; this component only presents the invoice.
  const canEdit = (line: AdminBillDetailInfo) => bill.issuanceStatus === 'DRAFT' && line.feeCode !== 'ELECTRIC' && !(line.feeCode === 'WATER' && line.oldReading != null)
  const draft = bill.issuanceStatus === 'DRAFT'
  const overdue = bill.status === 'Quá hạn' && bill.outstanding > 0
  const columns: ColumnsType<AdminBillDetailInfo> = [
    {title:'Khoản phí',dataIndex:'feeName',width:'28%',render:value=><strong>{value}</strong>},
    {title:'Chi tiết',render:(_,line)=>{
      const metered = ['ELECTRIC','WATER'].includes(line.feeCode) && line.oldReading!=null
      return metered ? <>{readingNumber(line.quantity)} {line.feeCode==='WATER'?'m³':'kWh'}<p className="detail-fee-note">{readingNumber(line.oldReading)} → {readingNumber(line.newReading)}</p></>
        : <span className="detail-fee-note">{line.note || 'Theo khoản phí đã ghi nhận'}</span>
    }},
    {title:'Thành tiền',dataIndex:'amount',align:'right',width:'27%',render:value=><strong>{readingMoney(value)}</strong>},
    ...(bill.details.some(canEdit) ? [{title:'Thao tác',key:'action',width:72,render:(_:unknown,line:AdminBillDetailInfo)=>canEdit(line)?<Button type="link" onClick={()=>onEdit(line)}>Sửa</Button>:null}] : []),
  ]
  return <div className="detail-sections">
    <div className="detail-overview">
      <div><span className="detail-label">Tổng tiền hóa đơn</span><div className="detail-value">{readingMoney(bill.totalAmount)}</div><p className={overdue?'detail-overdue':'detail-muted'}>Hạn thanh toán: {bill.dueDate?date(bill.dueDate):'Chưa có hạn thanh toán'}</p></div>
      <div><span className="detail-label">Trạng thái thanh toán</span><p><Tag color={draft?'default':bill.status==='Đã thanh toán'?'green':overdue?'red':'gold'}>{draft?'Chưa yêu cầu thanh toán':bill.status}</Tag></p><div className="detail-balance"><div><span className="detail-label">Đã thu</span><strong>{readingMoney(bill.paidAmount)}</strong></div><div><span className="detail-label">Còn lại</span><strong className={overdue?'detail-overdue':''}>{readingMoney(bill.outstanding)}</strong></div></div></div>
    </div>
    {draft && <Alert showIcon type={bill.publicationBlockers?.length?'warning':'info'} title="Hóa đơn nháp — cư dân chưa thể xem hoặc thanh toán"
      description={bill.publicationBlockers?.length?<ul>{bill.publicationBlockers.map((reason,index)=><li key={index}>{reason}</li>)}</ul>:'Đủ điều kiện để phát hành toàn bộ.'} />}
    <section><h3>Thông tin hóa đơn</h3><Descriptions column={{xs:1,sm:2,md:2,lg:2,xl:2,xxl:2}} size="small" items={[
      {key:'owner',label:'Chủ hộ',children:bill.ownerName||'—'},
      {key:'issuedAt',label:'Ngày phát hành',children:draft?'Chưa phát hành':bill.issuedAt?date(bill.issuedAt):'Không có dữ liệu lịch sử'},
      ...(!draft?[{key:'issuer',label:'Người phát hành',children:bill.issuedBy||'Không có dữ liệu lịch sử'}]:[]),
    ]} /></section>
    <section><h3>Chi tiết các khoản phí</h3><Table<AdminBillDetailInfo> className="detail-fees" rowKey="id" dataSource={bill.details} columns={columns} pagination={false} size="middle" scroll={{x:520}} /></section>
    <section><h3>Chỉ số điện và nước</h3><div className="detail-source-list">{(['ELECTRIC','WATER'] as const).map(code=>{
      const sources=bill.meterReadings?.filter(source=>source.feeCode===code) || []
      const water=code==='WATER', unit=water?'m³':'kWh'
      return <div key={code} className="detail-source"><div className="detail-source-top"><h4>{water?'Nước':'Điện'}</h4><Tag>{sources.length?'Đã liên kết':'Chưa liên kết'}</Tag></div>
        {sources.length ? sources.map(source=>{
          const line=bill.details.find(detail=>detail.id===source.detailId)
          const view: ReadingDetail = {readingId:source.readingId,apartmentCode:bill.apartmentCode,billingMonth:bill.billingMonth,meterService:water?'WATER':'ELECTRICITY',
            oldReading:source.oldReading??line?.oldReading??null,newReading:source.newReading??line?.newReading??null,usageAmount:source.usageAmount??line?.quantity??null,amount:source.amount??line?.amount??null,
            tariffSnapshot:source.tariffSnapshot,recordedBy:source.recordedBy,recordedAt:source.recordedAt,approvedBy:source.approvedBy,approvedAt:source.approvedAt}
          return <div key={source.readingId}><span className="detail-label">Bản ghi #{source.readingId}</span><p>Tiêu thụ: <strong>{readingNumber(view.usageAmount)} {unit}</strong></p><p className="detail-muted">Chỉ số: {readingNumber(view.oldReading)} → {readingNumber(view.newReading)}</p><p className="detail-source-money">{view.amount==null?'—':readingMoney(view.amount)}</p><Button onClick={()=>onViewReading(view)} aria-label={`Xem chi tiết chỉ số ${water?'nước':'điện'}`}>Xem chi tiết</Button></div>
        }) : <p className="detail-muted">Chưa có bản ghi liên kết. Khoản phí lịch sử, nếu có, được giữ nguyên trong bảng phí.</p>}
      </div>
    })}</div></section>
    {bill.status==='Đã thanh toán' && <section><h3>Thông tin giao dịch</h3><Descriptions column={{xs:1,sm:2,md:2,lg:2,xl:2,xxl:2}} size="small" items={[
      {key:'date',label:'Ngày trả',children:date(bill.paidAt)}, {key:'method',label:'Phương thức',children:method(bill.paymentMethod)},
      {key:'code',label:'Mã giao dịch',children:bill.transactionCode||'—'}, {key:'confirmed',label:'Người xác nhận',children:bill.confirmedBy||'Không có dữ liệu lịch sử'},
    ]} /></section>}
  </div>
}
