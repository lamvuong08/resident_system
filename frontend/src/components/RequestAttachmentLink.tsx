import { useEffect, useState } from 'react'
import { Image, Typography } from 'antd'
import { fetchAdminRequestAttachment, type AdminRequestAttachment } from '../utils/adminSupportApi'

// Fetch through the authenticated API; never put JWTs on image/link URLs.
export default function RequestAttachmentLink({ requestId, attachment }: { requestId: number; attachment: AdminRequestAttachment }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    let objectUrl = ''
    setUrl('')
    setFailed(false)
    void fetchAdminRequestAttachment(requestId, attachment.storedFileName).then((blob) => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [requestId, attachment.storedFileName])
  if (failed) return <Typography.Text type="secondary">Không thể tải tệp: {attachment.originalName}</Typography.Text>
  if (!url) return <Typography.Text type="secondary">Đang tải tệp…</Typography.Text>
  return <div className="request-detail-modal__attachment">
    {attachment.contentType?.startsWith('image/') && <Image src={url} alt={attachment.originalName} width={80} height={80}
      style={{ objectFit: 'cover', borderRadius: 8 }} onError={() => setFailed(true)} />}
    <a href={url} download={attachment.originalName}>{attachment.originalName}</a>
  </div>
}
