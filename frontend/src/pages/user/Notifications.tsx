import { useEffect, useState, useMemo } from 'react'
import { Alert, Card, Empty, Modal, Skeleton, Typography, message, Input, Checkbox, Button, Pagination, Space } from 'antd'
import { SearchOutlined, CheckSquareOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useResidentNotifications } from '../../hooks/useResidentNotifications'
import type { ResidentNotificationDetail } from '../../types/notification'
import { extractApiError } from '../../utils/api'
import { fetchMyNotificationDetail, formatNotificationDate } from '../../utils/notificationApi'
import '../../styles/resident-dashboard.css'
import '../../styles/resident-notifications.css'

const Notifications = () => {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const { loading, error, items, refresh, markAsRead, markAllAsRead, removeItem } = useResidentNotifications()
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<ResidentNotificationDetail | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const openDetails = async (id: number, updateRoute = true) => {
    setDetailLoading(true)
    setIsDetailOpen(true)
    try {
      await markAsRead(id)
      const data = await fetchMyNotificationDetail(id)
      setDetail(data)
      if (updateRoute) {
        navigate(`/user/notifications/${id}`, { replace: true })
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        message.warning('Thông báo này không còn tồn tại hoặc đã bị xóa (Ghost data đã được xoá).')
        removeItem(id)
      } else {
        message.error(extractApiError(err, 'Không thể tải chi tiết thông báo.'))
      }
      setIsDetailOpen(false)
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetails = () => {
    setIsDetailOpen(false)
    setDetail(null)
    navigate('/user/notifications', { replace: true })
  }

  useEffect(() => {
    const fromRouteId = Number(params.id ?? 0)
    if (fromRouteId > 0) {
      void openDetails(fromRouteId, false)
    } else {
      setIsDetailOpen(false)
      setDetail(null)
    }
  }, [params.id])

  const truncateContent = (value: string, maxLength = 140) =>
    value.length > maxLength ? `${value.slice(0, maxLength)}...` : value

  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (showUnreadOnly && item.isRead) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const titleMatch = item.title.toLowerCase().includes(term)
        const contentMatch = item.content && item.content.toLowerCase().includes(term)
        if (!titleMatch && !contentMatch) return false
      }
      return true
    })
  }, [items, showUnreadOnly, searchTerm])

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, showUnreadOnly])

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      message.success('Đã đánh dấu tất cả là đã đọc.')
    } catch (err) {
      message.error(extractApiError(err, 'Lỗi khi đánh dấu đã đọc.'))
    }
  }

  return (
    <div className="resident-page">
      <header className="ph-page-intro">
        <h1 className="ph-page-intro__title">Danh sách thông báo</h1>
        <p className="ph-page-intro__sub">
          Xem và quản lý các thông báo từ hệ thống và ban quản lý.
        </p>
      </header>

      {error && <Alert type="warning" showIcon message={error} className="profile-household__alert" />}

      <Card className="resident-notifications-card">
        <div className="resident-notifications-toolbar" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
          <Space wrap>
            <Input
              placeholder="Tìm kiếm tiêu đề, nội dung..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Checkbox
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
            >
              Chỉ hiện chưa đọc
            </Checkbox>
          </Space>
          <Space wrap>
            <Button icon={<CheckSquareOutlined />} onClick={handleMarkAllAsRead}>
              Đánh dấu tất cả đã đọc
            </Button>
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              Làm mới
            </Button>
          </Space>
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : filteredItems.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
        ) : (
          <>
            <div className="resident-notifications-list">
              {paginatedItems.map((item) => (
                <button
                  key={item.id}
                  className={`resident-notifications-item ${item.isRead ? 'read' : 'unread'}`}
                  type="button"
                  onClick={() => void openDetails(item.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <Typography.Text className="resident-notifications-item__title" strong style={{ flex: 1, paddingRight: 8, wordBreak: 'break-word', textAlign: 'left' }}>
                      {item.title}
                    </Typography.Text>
                    <Typography.Text className="resident-notifications-item__time" type="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12, marginTop: 0, flexShrink: 0 }}>
                      {formatNotificationDate(item.createdAt)}
                    </Typography.Text>
                  </div>
                  <Typography.Text className="resident-notifications-item__content" type="secondary" style={{ display: 'block' }}>
                    {truncateContent(item.content || 'Không có nội dung')}
                  </Typography.Text>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <Pagination
                current={currentPage}
                total={filteredItems.length}
                pageSize={pageSize}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
              />
            </div>
          </>
        )}
      </Card>

      <Modal
        title="Chi tiết thông báo"
        open={isDetailOpen}
        onCancel={closeDetails}
        footer={null}
        width={700}
      >
        {detailLoading || !detail ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <div className="resident-notification-detail">
            <Typography.Title level={4} className="resident-notification-detail__title">
              {detail.title}
            </Typography.Title>
            <Typography.Paragraph className="resident-notification-detail__meta">
              {formatNotificationDate(detail.createdAt)} | Người gửi: {detail.createdBy || 'Hệ thống'}
            </Typography.Paragraph>
            <Typography.Paragraph>{detail.content || 'Không có nội dung'}</Typography.Paragraph>

            <div>
              <Typography.Text strong>File đính kèm</Typography.Text>
              {detail.attachments.length === 0 ? (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                  Không có file đính kèm.
                </Typography.Paragraph>
              ) : (
                <div className="resident-notification-detail__attachments">
                  {detail.attachments.map((attachment) => (
                    <a key={`${attachment.name}-${attachment.url}`} href={attachment.url} target="_blank" rel="noreferrer">
                      {attachment.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Notifications
