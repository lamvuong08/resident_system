import { Alert, Button, Card, Collapse, Descriptions, Empty, Select, Skeleton, Tag } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircleOutlined, FileTextOutlined, HistoryOutlined, QrcodeOutlined, WalletOutlined, WarningOutlined } from '@ant-design/icons'
import SePayQrModal from '../../components/SePayQrModal'
import { useNotification } from '../../context/NotificationContext'
import type { UserAggregatedBill, UserBillDetailInfo, UserBillFull } from '../../types/residentDashboard'
import { getMyAggregatedBills, getMyBillDetail } from '../../utils/residentDashboard'
import { parseTariffSnapshot } from '../../utils/tariffPresentation'
import { paymentDate, paymentMoney, paymentStatus, sortResidentBills } from '../../utils/residentPaymentPresentation'
import '../../styles/user-payment.css'

function StatusTag({ status }: { status: string }) {
  const kind = paymentStatus(status)
  return <Tag color={kind === 'paid' ? 'success' : kind === 'overdue' ? 'error' : 'warning'}
    icon={kind === 'paid' ? <CheckCircleOutlined /> : kind === 'overdue' ? <WarningOutlined /> : <WalletOutlined />}>
    {kind === 'paid' ? 'Đã thanh toán' : kind === 'overdue' ? 'Quá hạn' : status === 'PENDING' ? 'Đang xác minh' : 'Chưa thanh toán'}
  </Tag>
}

const readingNumber = (value?: number | null) => value == null ? 'Chưa có thông tin' : value.toLocaleString('vi-VN')

function UtilityFee({ fee, bill }: { fee: UserBillDetailInfo; bill: UserBillFull }) {
  const sources = bill.meterReadings?.filter(source => source.feeCode === fee.feeCode) || []
  const sameCodeFees = bill.details.filter(line => line.feeCode === fee.feeCode)
  const source = sources.find(item => item.detailId === fee.id)
    || (sources.length === 1 && sameCodeFees.length === 1 ? sources[0] : undefined)
  const quantity = fee.quantity ?? source?.usageAmount
  const unit = fee.feeCode === 'WATER' ? 'm³' : 'kWh'
  const tariff = parseTariffSnapshot(source?.tariffSnapshot)
  return <Collapse className="resident-utility-collapse" items={[{
    key: fee.id,
    label: <div className="resident-utility-summary">
      <span><strong>{fee.feeName}</strong><span className="resident-payment-muted">{quantity == null ? 'Xem thông tin đã ghi nhận' : `${readingNumber(quantity)} ${unit}`}</span></span>
      <span className="resident-utility-summary-end"><strong className="resident-payment-money">{paymentMoney(fee.amount)}</strong><span className="resident-payment-link">Xem chi tiết</span></span>
    </div>,
    children: <div className="resident-utility-detail">
      <Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
        { key: 'old', label: 'Chỉ số cũ', children: readingNumber(fee.oldReading ?? source?.oldReading) },
        { key: 'new', label: 'Chỉ số mới', children: readingNumber(fee.newReading ?? source?.newReading) },
        { key: 'quantity', label: 'Tiêu thụ', children: quantity == null ? 'Chưa có thông tin' : `${readingNumber(quantity)} ${unit}` },
        { key: 'price', label: 'Đơn giá', children: fee.unitPrice == null ? 'Theo biểu giá đã ghi nhận' : `${paymentMoney(fee.unitPrice)}/${unit}` },
        { key: 'amount', label: 'Thành tiền', children: paymentMoney(fee.amount) },
        ...(fee.dueDate ? [{ key: 'due', label: 'Hạn thanh toán', children: paymentDate(fee.dueDate) }] : []),
      ]} />
      {tariff ? <>
        <h4>Biểu giá đã áp dụng</h4>
        {tariff.effective && <p className="resident-payment-muted">Hiệu lực: {tariff.effective}</p>}
        <table className="resident-tariff-table">
          <caption className="resident-payment-sr-only">Các bậc giá của {fee.feeName}</caption>
          <thead><tr><th scope="col">Mức tiêu thụ ({unit})</th><th scope="col">Đơn giá</th></tr></thead>
          <tbody>{tariff.tiers.map(tier => <tr key={tier.key}><td>{tier.min.toLocaleString('vi-VN')} – {tier.max == null ? 'không giới hạn' : tier.max.toLocaleString('vi-VN')}</td><td>{paymentMoney(tier.price)}/{tier.unit}</td></tr>)}</tbody>
        </table>
      </> : source?.tariffSnapshot ? <><h4>Biểu giá đã áp dụng</h4><p className="resident-tariff-snapshot">{source.tariffSnapshot}</p></> : <p className="resident-payment-muted">Hóa đơn này chưa có thông tin biểu giá chi tiết.</p>}
      {fee.note && <p className="resident-payment-note">{fee.note}</p>}
    </div>,
  }]} />
}

export function ResidentInvoiceContent({ bill, onPay }: { bill: UserBillFull; onPay: () => void }) {
  const status = paymentStatus(bill.status)
  const utilities = bill.details.filter(fee => ['ELECTRIC', 'WATER'].includes(fee.feeCode || ''))
  const services = bill.details.filter(fee => !['ELECTRIC', 'WATER'].includes(fee.feeCode || ''))
  const paymentMethod = ({ CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', TRANSFER: 'Chuyển khoản', MOMO: 'MoMo', ZALOPAY: 'ZaloPay' } as Record<string, string>)[bill.paymentMethod || ''] || bill.paymentMethod
  return <Card className="resident-invoice-card">
    <div className="resident-invoice-heading"><div><p className="resident-payment-eyebrow">Chi tiết hóa đơn · #{bill.id}</p><h2>Hóa đơn tháng {bill.billingMonth}</h2><p className="resident-payment-muted">Căn hộ <strong>{bill.apartmentCode}</strong></p></div><StatusTag status={bill.status} /></div>
    <div className="resident-invoice-overview">
      <div className="resident-invoice-total"><span>Tổng giá trị hóa đơn</span><strong className="resident-payment-money">{paymentMoney(bill.totalAmount)}</strong></div>
      <dl className="resident-invoice-dates"><div><dt>Ngày phát hành</dt><dd>{paymentDate(bill.issuedAt)}</dd></div><div><dt>Hạn thanh toán</dt><dd className={status === 'overdue' ? 'resident-payment-overdue' : ''}>{paymentDate(bill.dueDate)}</dd></div></dl>
    </div>
    {(bill.paidAmount != null || bill.outstanding != null) && <dl className="resident-invoice-balance">
      {bill.paidAmount != null && <div><dt>Đã thanh toán</dt><dd className="resident-payment-money">{paymentMoney(bill.paidAmount)}</dd></div>}
      {bill.outstanding != null && <div><dt>Còn phải thanh toán</dt><dd className="resident-payment-money">{paymentMoney(bill.outstanding)}</dd></div>}
    </dl>}
    <div className="resident-invoice-action">
      {status === 'paid' ? <div className="resident-payment-confirmed"><CheckCircleOutlined /> Hóa đơn đã được xác nhận thanh toán</div> : <>
        {status === 'overdue' && <Alert type="warning" showIcon title="Hóa đơn đã quá hạn thanh toán" description="Bạn vẫn có thể thanh toán các khoản còn nợ theo thông tin hóa đơn." />}
        {bill.outstanding === 0 ? <p className="resident-payment-muted">Không có khoản tiền còn phải thanh toán.</p> : <Button type="primary" size="large" icon={<QrcodeOutlined />} onClick={onPay}>Thanh toán bằng QR</Button>}
      </>}
    </div>
    {services.length > 0 && <section className="resident-invoice-fee-section" aria-labelledby="resident-service-heading"><h3 id="resident-service-heading">Phí dịch vụ</h3><ul className="resident-fee-list">{services.map(fee => <li key={fee.id}><div><strong>{fee.feeName}</strong>{fee.note && <p className="resident-payment-note">{fee.note}</p>}{fee.dueDate && <p className="resident-payment-muted">Hạn: {paymentDate(fee.dueDate)}</p>}</div><strong className="resident-payment-money">{paymentMoney(fee.amount)}</strong></li>)}</ul></section>}
    {utilities.length > 0 && <section className="resident-invoice-fee-section" aria-labelledby="resident-utility-heading"><h3 id="resident-utility-heading">Phí điện nước</h3><p className="resident-payment-muted">Mở từng khoản để xem chỉ số và biểu giá đã áp dụng.</p><div className="resident-utility-list">{utilities.map(fee => <UtilityFee key={fee.id} fee={fee} bill={bill} />)}</div></section>}
    {!bill.details.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông tin các khoản phí." />}
    <div className="resident-invoice-footer"><span>Tổng cộng</span><strong className="resident-payment-money">{paymentMoney(bill.totalAmount)}</strong></div>
    {status === 'paid' && (bill.paidAt || bill.transactionCode || paymentMethod) && <section className="resident-payment-receipt"><h3>Thông tin thanh toán</h3><Descriptions size="small" column={1} items={[
      ...(bill.paidAt ? [{ key: 'paidAt', label: 'Thời gian', children: paymentDate(bill.paidAt, true) }] : []),
      ...(paymentMethod ? [{ key: 'method', label: 'Phương thức', children: paymentMethod }] : []),
      ...(bill.transactionCode ? [{ key: 'code', label: 'Mã giao dịch', children: bill.transactionCode }] : []),
    ]} /></section>}
  </Card>
}

export default function Payment() {
  const [bills, setBills] = useState<UserAggregatedBill[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailRevision, setDetailRevision] = useState(0)
  const [detail, setDetail] = useState<{ id: number | null; revision: number; bill: UserBillFull | null; error: boolean }>({ id: null, revision: -1, bill: null, error: false })
  const [filter, setFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const mounted = useRef(false)
  const listRequest = useRef(0)
  const { notifications } = useNotification()
  const latestPaymentNotification = notifications.find(item => item.type === 'PAYMENT')?.id
  const previousPaymentNotification = useRef(latestPaymentNotification)

  const refreshBills = useCallback(async () => {
    const request = ++listRequest.current
    try {
      const next = sortResidentBills(await getMyAggregatedBills())
      if (!mounted.current || request !== listRequest.current) return
      setBills(next)
      setListError('')
      setSelectedId(previous => next.some(bill => bill.id === previous) ? previous : next[0]?.id ?? null)
    } catch {
      if (mounted.current && request === listRequest.current) setListError('Không thể tải các kỳ hóa đơn. Vui lòng thử lại.')
    } finally {
      if (mounted.current && request === listRequest.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void refreshBills()
    return () => { mounted.current = false }
  }, [refreshBills])

  useEffect(() => {
    if (selectedId == null) return
    const controller = new AbortController()
    void getMyBillDetail(selectedId, controller.signal).then(bill => {
      if (!controller.signal.aborted) setDetail({ id: selectedId, revision: detailRevision, bill, error: false })
    }).catch(() => {
      if (!controller.signal.aborted) setDetail({ id: selectedId, revision: detailRevision, bill: null, error: true })
    })
    return () => controller.abort()
  }, [selectedId, detailRevision])

  useEffect(() => {
    if (latestPaymentNotification == null || latestPaymentNotification === previousPaymentNotification.current) return
    previousPaymentNotification.current = latestPaymentNotification
    void refreshBills().then(() => { if (mounted.current) setDetailRevision(previous => previous + 1) })
  }, [latestPaymentNotification, refreshBills])

  const handlePaid = useCallback(() => {
    void refreshBills()
    setDetailRevision(previous => previous + 1)
  }, [refreshBills])
  const detailLoading = selectedId != null && (detail.id !== selectedId || detail.revision !== detailRevision)
  const visibleBills = bills.filter(bill => filter === 'all' || paymentStatus(bill.status) === filter)

  return <div className="user-payment-page resident-payment-page">
    <header className="ph-page-intro"><h1 className="ph-page-intro__title">Thanh toán hóa đơn</h1><p className="ph-page-intro__sub">Theo dõi các khoản phí và thanh toán cho căn hộ của bạn.</p></header>
    {listError && <Alert className="resident-payment-alert" type="error" showIcon title={listError} action={<Button onClick={() => { setLoading(true); void refreshBills() }}>Thử lại</Button>} />}
    <div className="resident-payment-layout">
      <section id="resident-invoice-detail" className="resident-payment-main" aria-label="Chi tiết hóa đơn đang chọn" aria-busy={loading || detailLoading}>
        {loading || detailLoading ? <Card><Skeleton active paragraph={{ rows: 8 }} /><span className="resident-payment-sr-only" role="status">Đang tải hóa đơn</span></Card>
          : selectedId != null && detail.error ? <Card><Alert type="error" showIcon title="Không thể tải chi tiết hóa đơn" description="Vui lòng thử lại hoặc chọn một kỳ hóa đơn khác." action={<Button onClick={() => setDetailRevision(previous => previous + 1)}>Thử lại</Button>} /></Card>
          : detail.bill && selectedId != null ? <ResidentInvoiceContent bill={detail.bill} onPay={() => setIsModalOpen(true)} />
          : <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={listError ? 'Hóa đơn chưa tải được. Vui lòng thử lại.' : 'Bạn chưa có hóa đơn nào được phát hành.'} /></Card>}
      </section>
      <aside className="resident-payment-periods" aria-labelledby="resident-periods-heading"><Card>
        <div className="resident-periods-heading"><h2 id="resident-periods-heading"><HistoryOutlined /> Các kỳ hóa đơn</h2><span className="resident-payment-muted">{loading ? 'Đang tải' : `${bills.length} kỳ`}</span></div>
        <Select className="resident-period-filter" aria-label="Lọc kỳ hóa đơn" value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Tất cả hóa đơn' }, { value: 'overdue', label: 'Quá hạn' }, { value: 'unpaid', label: 'Chưa thanh toán' }, { value: 'paid', label: 'Đã thanh toán' },
        ]} />
        {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : <ul className="resident-period-list">{visibleBills.map(bill => <li key={bill.id}>
          <button type="button" className={`resident-period-button${selectedId === bill.id ? ' is-selected' : ''}`} aria-pressed={selectedId === bill.id} aria-controls="resident-invoice-detail" onClick={() => setSelectedId(bill.id)}>
            <span className="resident-period-top"><strong>Kỳ {bill.billingMonth}</strong><strong className="resident-payment-money">{paymentMoney(bill.totalAmount)}</strong></span>
            <span className="resident-period-due">Hạn: {paymentDate(bill.dueDate)}</span>
            <span className="resident-period-bottom"><span className="resident-period-selected">{selectedId === bill.id ? <><FileTextOutlined /> Đang xem</> : 'Xem hóa đơn'}</span><StatusTag status={bill.status} /></span>
          </button>
        </li>)}</ul>}
        {!loading && !visibleBills.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={listError ? 'Chưa tải được danh sách.' : bills.length ? 'Không có hóa đơn phù hợp.' : 'Chưa có kỳ hóa đơn.'} />}
      </Card></aside>
    </div>
    <SePayQrModal billId={selectedId ?? undefined} open={isModalOpen} onClose={() => setIsModalOpen(false)} onPaid={handlePaid} />
  </div>
}
