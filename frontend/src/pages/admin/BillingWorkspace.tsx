import { useEffect, useState } from 'react'
import { Alert, Button, Card, DatePicker, Descriptions, Input, Select, Space, Table, Tabs, Typography, message } from 'antd'
import { useLocation, useSearchParams, Navigate } from 'react-router-dom'
import dayjs from 'dayjs'
import api, { extractApiError } from '../../utils/api'
import ElectricityManagement from './ElectricityManagement'
import AdminPaymentManagement from './AdminPaymentManagement'
import '../../styles/billing-workspace.css'

type Overview = { totalCollected: number; totalUnpaid: number; unpaidHouseholds: number; overdueBills: number; pendingElectricity: number; pendingWater: number; draftBills: number }
type Transaction = { id: number; transactionCode: string; amount: number; paymentMethod: string; status: string; paidAt: string; confirmedBy: string; invoices: { id: number; apartmentCode: string; billingMonth: string }[] }
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`
export function LegacyBillingRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search); params.set('tab', 'readings')
  return <Navigate replace to={`/admin/quan-ly-thanh-toan?${params}`} />
}
export default function BillingWorkspace() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'overview'
  const rawMonth = params.get('month') || dayjs().format('YYYY-MM')
  const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? dayjs(`${rawMonth}-01`) : dayjs()
  const month = period.format('MM/YYYY')
  const [revision, setRevision] = useState(0)
  const [overview, setOverview] = useState<Overview>()
  const [overviewError, setOverviewError] = useState('')
  const [invoice, setInvoice] = useState<number>()
  const [history, setHistory] = useState<Transaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [apartment, setApartment] = useState('')
  const [status, setStatus] = useState<string>()
  const [receipt, setReceipt] = useState<Transaction>()
  const [processing, setProcessing] = useState<number>()
  const processPayment = async (id: number, decision: 'approve' | 'reject') => {
    setProcessing(id)
    try { await api.post(`/payments/${id}/${decision}`); message.success('Đã xử lý giao dịch'); setRevision(value=>value+1); setReceipt(undefined) }
    catch(error) { message.error(extractApiError(error,'Không thể xử lý giao dịch')) }
    finally { setProcessing(undefined) }
  }
  const change = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); return next })
  const openBill = (id: number) => { setInvoice(id); change('tab', 'invoices') }
  useEffect(() => {
    let active = true
    api.get('/admin/payments/overview', { params: { billingMonth: month } }).then(response => { if(active) {setOverview(response.data);setOverviewError('')} }).catch(error => {if(active)setOverviewError(extractApiError(error, 'Không tải được tổng quan'))})
    return () => { active = false }
  }, [month, revision])
  useEffect(() => {
    if(tab !== 'history') return
    let active = true; setHistoryLoading(true)
    api.get('/admin/payments/history', {params:{billingMonth:month,apartmentCode:apartment,status,page:page-1,size:10}}).then(response => {if(active){setHistory(response.data.content);setTotal(response.data.totalElements)}}).catch(error=>{if(active)message.error(extractApiError(error,'Không tải được lịch sử'))}).finally(()=>{if(active)setHistoryLoading(false)})
    return () => { active = false }
  }, [tab, month, revision, apartment, status, page])
  const labels: [keyof Overview, string, string?][] = [['totalCollected','Tổng đã thu'],['totalUnpaid','Tổng chưa thu'],['unpaidHouseholds','Hộ chưa đóng','count'],['overdueBills','Hóa đơn quá hạn','count'],['pendingElectricity','Chỉ số điện chờ duyệt','count'],['pendingWater','Chỉ số nước chờ duyệt','count'],['draftBills','Hóa đơn nháp','count']]
  return <div className="billing-workspace">
    <div className="billing-heading"><div><Typography.Title level={2}>Quản lý thanh toán & Hóa đơn</Typography.Title><Typography.Text type="secondary">Duyệt chỉ số → kiểm tra hóa đơn nháp → phát hành → theo dõi thanh toán</Typography.Text></div>
      <DatePicker aria-label="Kỳ thanh toán" picker="month" format="MM/YYYY" value={period} allowClear={false} onChange={value=>{if(value){change('month',value.format('YYYY-MM'));setPage(1)}}} />
    </div>
    <Tabs className="billing-tabs" activeKey={tab} onChange={value=>change('tab',value)} destroyOnHidden items={[
      {key:'overview',label:'Tổng quan',children:<>{overviewError && <Alert type="error" title={overviewError} />}<div className="billing-metrics">{labels.map(([key,label,count])=><Card key={key} size="small"><Typography.Text type="secondary">{label}</Typography.Text><Typography.Title level={3}>{overview ? count ? overview[key] : money(overview[key]) : '—'}</Typography.Title></Card>)}</div><Alert showIcon type="info" title="Duyệt chỉ số chỉ cập nhật hóa đơn nháp" description="Kiểm tra đủ điện, nước và phí trước khi phát hành. Cư dân chỉ nhận được hóa đơn sau bước phát hành toàn bộ." /></>},
      {key:'readings',label:'Duyệt chỉ số điện, nước',children:<ElectricityManagement billingMonth={month} onChanged={()=>setRevision(value=>value+1)} onOpenBill={openBill} />},
      {key:'invoices',label:'Quản lý hóa đơn',children:<AdminPaymentManagement billingMonth={month} initialBillId={invoice} onChanged={()=>setRevision(value=>value+1)} />},
      {key:'history',label:'Lịch sử thanh toán',children:<><Space wrap style={{marginBottom:16}}><Input aria-label="Tìm căn hộ thanh toán" placeholder="Mã căn hộ" value={apartment} onChange={event=>{setApartment(event.target.value);setPage(1)}} /><Select placeholder="Trạng thái" allowClear value={status} onChange={value=>{setStatus(value);setPage(1)}} options={['PENDING','SUCCESS','FAILED'].map(value=>({value,label:value==='SUCCESS'?'Đã xác nhận':value==='PENDING'?'Chờ xác nhận':'Từ chối'}))} /><Button onClick={()=>setRevision(value=>value+1)}>Làm mới</Button></Space>
        <Table<Transaction> rowKey="id" loading={historyLoading} dataSource={history} pagination={{current:page,total,pageSize:10,onChange:setPage}} scroll={{x:950}} columns={[
          {title:'Mã giao dịch',render:(_,row)=><Button type="link" onClick={()=>setReceipt(row)}>{row.transactionCode || `#${row.id}`}</Button>},
          {title:'Hóa đơn / căn hộ / kỳ',render:(_,row)=><Space wrap>{row.invoices.map(bill=><Button key={bill.id} type="link" onClick={()=>openBill(bill.id)}>#{bill.id} · {bill.apartmentCode} · {bill.billingMonth}</Button>)}</Space>},
          {title:'Số tiền',dataIndex:'amount',render:money},{title:'Phương thức',dataIndex:'paymentMethod'}, {title:'Trạng thái',dataIndex:'status'},
          {title:'Ngày trả',dataIndex:'paidAt',render:value=>value?dayjs(value).format('DD/MM/YYYY HH:mm'):'—'}, {title:'Người xác nhận',dataIndex:'confirmedBy',render:value=>value||'—'},
          {title:'Thao tác',render:(_,row)=>row.status==='PENDING' && <Space><Button disabled={processing!=null} onClick={()=>void processPayment(row.id,'approve')}>Duyệt</Button><Button danger disabled={processing!=null} onClick={()=>void processPayment(row.id,'reject')}>Từ chối</Button></Space>}
        ]} />
        {receipt && <Card title={`Giao dịch ${receipt.transactionCode || receipt.id}`} extra={<Button onClick={()=>setReceipt(undefined)}>Đóng</Button>}><Descriptions items={[{key:'amount',label:'Số tiền',children:money(receipt.amount)},{key:'method',label:'Phương thức',children:receipt.paymentMethod},{key:'status',label:'Trạng thái',children:receipt.status},{key:'actor',label:'Xác nhận bởi',children:receipt.confirmedBy||'Không có dữ liệu lịch sử'}]} /></Card>}
      </>}
    ]} />
  </div>
}
