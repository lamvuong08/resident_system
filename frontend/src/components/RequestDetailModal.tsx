import type { CSSProperties, ReactNode } from 'react'
import { Alert, Avatar, Button, Image, Modal, Skeleton, Tag, Timeline, theme } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { getAdminRequestStatusLabel, getAdminRequestTypeLabel, type AdminRequestRow, type AssignmentHistory } from '../utils/adminSupportApi'
import { buildRequestTimeline, formatRequestDetailDate } from '../utils/requestDetail'
import RequestAttachmentLink from './RequestAttachmentLink'
import '../styles/request-detail-modal.css'

type Props = {
  open: boolean
  loading: boolean
  request: AdminRequestRow | null
  history: AssignmentHistory[]
  historyLoading: boolean
  historyError: boolean
  onClose: () => void
  actions?: ReactNode
  children?: ReactNode
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="request-detail-modal__field"><dt>{label}</dt><dd>{children && children !== 'N/A' ? children : 'Chưa có thông tin'}</dd></div>
}

export default function RequestDetailModal({ open, loading, request, history, historyLoading, historyError, onClose, actions, children }: Props) {
  const { token } = theme.useToken()
  const colors: Record<string, string> = { PENDING: 'gold', ASSIGNED: 'blue', IN_PROGRESS: 'cyan', COMPLETED: 'green', REJECTED: 'red' }
  const isSelfClaim = request?.assignmentMethod === 'SELF_CLAIM'
  const method = isSelfClaim ? 'Tự nhận công việc' : request?.assignmentMethod === 'ADMIN_ASSIGNED' ? 'Ban quản lý phân công' : null
  const events = request ? buildRequestTimeline(request, history) : []
  const variables = {
    '--rd-text': token.colorText, '--rd-muted': token.colorTextSecondary,
    '--rd-border': token.colorBorderSecondary, '--rd-soft': token.colorFillQuaternary,
    '--rd-font': token.fontFamily, '--rd-bg': token.colorBgElevated,
    '--rd-scrollbar': token.colorTextQuaternary, '--rd-scrollbar-hover': token.colorTextTertiary,
  } as CSSProperties
  return <Modal open={open} onCancel={onClose} width={700} centered destroyOnHidden
    className="request-detail-modal" styles={{ root: variables }}
    classNames={{ container: 'request-detail-modal__container', header: 'request-detail-modal__header', body: 'request-detail-modal__body', footer: 'request-detail-modal__footer' }}
    title={<div className="request-detail-modal__heading">
      <div><h2>Chi tiết yêu cầu{request ? ` #${request.id}` : ''}</h2><p>Thông tin và tiến độ xử lý yêu cầu</p></div>
      {request && <Tag className="request-detail-modal__status" color={colors[request.status]}>{getAdminRequestStatusLabel(request.status)}</Tag>}
    </div>}
    footer={<div className="request-detail-modal__actions"><Button className="fix-height-32" onClick={onClose}>Đóng</Button>{!loading && actions}</div>}>
    {loading || !request ? <Skeleton active paragraph={{ rows: 8 }} /> : <>
      <section className="request-detail-modal__section" aria-label="Thông tin yêu cầu">
        <h3>Thông tin yêu cầu</h3>
        <dl className="request-detail-modal__grid">
          <Field label="Cư dân">{request.resident.name}</Field>
          <Field label="Căn hộ">{request.resident.apartment}</Field>
          <Field label="Loại yêu cầu">{getAdminRequestTypeLabel(request.type)}</Field>
          <Field label="Ngày gửi">{formatRequestDetailDate(request.createdAt)}</Field>
        </dl>
      </section>
      <section className="request-detail-modal__section" aria-label="Thông tin phân công">
        <h3>Thông tin phân công</h3>
        <div className="request-detail-modal__assignment">
          <div className="request-detail-modal__assignee">
            <Avatar size={40} icon={!request.assignedStaff ? <UserOutlined /> : undefined}>
              {request.assignedStaff?.name.trim().split(/\s+/).at(-1)?.slice(0, 1).toLocaleUpperCase('vi-VN')}
            </Avatar>
            <div className="request-detail-modal__person"><strong>{request.assignedStaff?.name || 'Chưa phân công'}</strong><span>Nhân viên phụ trách</span></div>
            {method && request.assignedStaff && <Tag className="request-detail-modal__method">{method}</Tag>}
          </div>
          {request.assignedStaff && <dl className="request-detail-modal__grid">
            {request.assignedBy && <Field label={isSelfClaim ? 'Người tiếp nhận' : 'Người phân công'}>{request.assignedBy.name}</Field>}
            <Field label={isSelfClaim ? 'Thời gian tiếp nhận' : 'Thời gian phân công'}>{formatRequestDetailDate(request.assignedAt)}</Field>
          </dl>}
        </div>
      </section>
      <section className="request-detail-modal__section" aria-label="Nội dung yêu cầu">
        <h3>Nội dung yêu cầu</h3>
        <div className="request-detail-modal__content">{request.content || 'Không có nội dung yêu cầu.'}</div>
        <div className="request-detail-modal__attachments">
          {request.attachments?.length ? <>
            <span>Tệp đính kèm</span>
            <Image.PreviewGroup><div className="request-detail-modal__files">{request.attachments.map((attachment) =>
              <RequestAttachmentLink key={attachment.storedFileName} requestId={request.id} attachment={attachment} />
            )}</div></Image.PreviewGroup>
          </> : <span>Không có tệp đính kèm</span>}
        </div>
      </section>
      <section className="request-detail-modal__section" aria-label="Tiến độ và lịch sử xử lý">
        <h3>Tiến độ và lịch sử xử lý</h3>
        {historyLoading && <Skeleton active paragraph={{ rows: 2 }} />}
        {historyError && <Alert type="warning" showIcon title="Chưa tải được lịch sử phân công. Các mốc thời gian hiện có vẫn được hiển thị." />}
        <Timeline className="request-detail-modal__timeline" items={events.map((event) => ({
          key: event.key, color: event.color,
          content: <div><strong className="request-detail-modal__event-title">{event.title}</strong><time>{formatRequestDetailDate(event.date)}</time>{event.detail && <p>{event.detail}</p>}</div>,
        }))} />
      </section>
    </>}
    {children}
  </Modal>
}
