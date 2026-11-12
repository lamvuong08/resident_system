import { Alert, Button, Descriptions, Image, Modal, Skeleton, Tag, Typography } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import api from '../utils/api'
import { paymentMoney, paymentQrErrorMessage } from '../utils/residentPaymentPresentation'

type QrInfo = {
  billId: number; apartmentCode: string; outstanding: number; paymentCode: string
  bank: string; accountNumber: string; accountName: string; qrUrl: string | null
  testMode: boolean; status: 'WAITING' | 'PAID' | 'MANUAL_PENDING'
}

function SePayQrContent({ billId, onPaid }: { billId: number; onPaid: () => void }) {
  const [info, setInfo] = useState<QrInfo>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  const paidCallback = useRef(onPaid)
  useEffect(() => { paidCallback.current = onPaid }, [onPaid])
  useEffect(() => {
    const controller = new AbortController()
    let finished = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      try {
        const response = await api.get<QrInfo>(`/payments/sepay/bills/${billId}/qr`, { signal: controller.signal, timeout: 12000 })
        if (controller.signal.aborted) return
        setInfo(response.data)
        setError('')
        if (response.data.status === 'PAID') {
          finished = true
          paidCallback.current()
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(paymentQrErrorMessage(err))
          finished = true
        }
      }
      if (!controller.signal.aborted && !finished) timer = setTimeout(refresh, 5000)
    }
    void refresh()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [billId, attempt])

  const retry = () => { setInfo(undefined); setError(''); setImageFailed(false); setAttempt(previous => previous + 1) }
  if (error) return <Alert type="warning" showIcon title="Chưa thể hiển thị thanh toán QR" description={error}
    action={<Button icon={<ReloadOutlined />} onClick={retry}>Thử lại</Button>} />
  if (!info) return <div className="resident-qr-loading" role="status" aria-live="polite"><Skeleton.Image active /><span>Đang tải mã QR và thông tin thanh toán…</span></div>

  return <>
    <div className="resident-qr-summary"><div><h3>Hóa đơn #{info.billId}</h3><p>Căn hộ {info.apartmentCode}</p></div><div><span className="resident-payment-muted">Còn phải thanh toán</span><strong className="resident-qr-amount resident-payment-money">{paymentMoney(info.outstanding)}</strong></div></div>
    {info.status === 'WAITING' && info.outstanding > 0 && <div className="resident-qr-display">
      {imageFailed || !info.qrUrl ? <Alert type="warning" showIcon title="Chưa tải được hình mã QR" description="Vui lòng thử lại để hiển thị mã thanh toán." action={<Button onClick={retry}>Tải lại</Button>} />
        : <Image src={info.qrUrl} alt={`Mã QR thanh toán hóa đơn ${info.paymentCode}`} width={240} preview={false} onError={() => setImageFailed(true)} placeholder={<Skeleton.Image active />} />}
      <Tag color="processing" icon={<ClockCircleOutlined />}>Đang chờ xác nhận thanh toán</Tag>
      <p className="resident-qr-instructions">Trạng thái sẽ tự cập nhật sau khi giao dịch được xác nhận.</p>
    </div>}
    {info.status === 'PAID' && <Alert className="resident-qr-status" type="success" showIcon icon={<CheckCircleOutlined />} title="Hóa đơn đã thanh toán" description="Thanh toán của bạn đã được xác nhận. Bạn có thể đóng cửa sổ này." />}
    {info.status === 'MANUAL_PENDING' && <Alert className="resident-qr-status" type="info" showIcon title="Thanh toán đang được đối soát" description="Ban quản lý đang kiểm tra giao dịch. Vui lòng không chuyển thêm tiền." />}
    {info.status === 'WAITING' && info.outstanding <= 0 && <Alert className="resident-qr-status" type="info" showIcon title="Không có khoản tiền còn phải thanh toán" />}
    <div className="resident-qr-info"><Descriptions column={1} size="small" items={[
      { key: 'code', label: 'Nội dung chuyển khoản', children: <Typography.Text strong copyable>{info.paymentCode}</Typography.Text> },
      { key: 'bank', label: 'Ngân hàng', children: info.bank || 'Chưa có thông tin' },
      { key: 'account', label: 'Số tài khoản', children: info.accountNumber ? <Typography.Text copyable>{info.accountNumber}</Typography.Text> : 'Chưa có thông tin' },
      { key: 'name', label: 'Thụ hưởng', children: info.accountName || 'Chưa có thông tin' },
    ]} /></div>
  </>
}

export default function SePayQrModal({ billId, open, onClose, onPaid }: {
  billId?: number; open: boolean; onClose: () => void; onPaid: () => void
}) {
  return <Modal rootClassName="resident-payment-qr-modal" title={<><QrcodeOutlined /> Thanh toán hóa đơn</>} open={open} onCancel={onClose}
    footer={<Button onClick={onClose}>Đóng</Button>} width={520}>
    {open && billId != null && <SePayQrContent key={billId} billId={billId} onPaid={onPaid} />}
  </Modal>
}
