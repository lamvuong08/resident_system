import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Modal, Select, Space, message, Tabs, Pagination, Table, Card } from 'antd'
import { FileImageOutlined, FileOutlined, FilePdfOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons'
import type { UserRequestAttachment, UserRequestRow, UserRequestStats } from '../../../types/userSupport'
import {
  deleteUserRequest,
  downloadUserRequestAttachment,
  formatAttachmentSize,
  formatUserRequestDate,
  getUserRequestTypeLabel,
  updateUserRequest,
} from '../../../utils/userSupportApi'
import { extractApiError } from '../../../utils/api'
import StatCard from '../../../components/StatCard'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons'
import '../../../styles/resident-request-history.css'

type RequestHistoryProps = {
  items: UserRequestRow[]
  loading: boolean
  stats: UserRequestStats
  statsLoading: boolean
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  totalPages: number
  totalElements: number
  pageSize: number
  refreshAll: () => Promise<void>
  onCreateNew: () => void
}

const AttachmentPreview: React.FC<{ requestId: number; att: UserRequestAttachment }> = ({ requestId, att }) => {
  const [url, setUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)
  const isImg = att.contentType?.toLowerCase().startsWith('image/')

  useEffect(() => {
    if (!isImg) {
      setUrl(null)
      return
    }
    let alive = true
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    void downloadUserRequestAttachment(requestId, att.storedFileName)
      .then((blob) => {
        if (!alive) return
        const objectUrl = URL.createObjectURL(blob)
        urlRef.current = objectUrl
        setUrl(objectUrl)
      })
      .catch(() => { })
    return () => {
      alive = false
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
      setUrl(null)
    }
  }, [requestId, att.storedFileName, att.contentType, isImg])

  if (!isImg) return null
  if (!url) return <div className="request-attachment-preview request-attachment-preview--loading">Đang tải ảnh…</div>
  return <img className="request-attachment-preview__img" src={url} alt="" />
}

const RequestHistory: React.FC<RequestHistoryProps> = ({
  items,
  loading,
  stats,
  statsLoading,
  currentPage,
  setCurrentPage,
  totalElements,
  pageSize,
  refreshAll,
  onCreateNew,
}) => {
  const [activeTab, setActiveTab] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<UserRequestRow | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ type: 'REPAIR', description: '' })
  const [editKeepStored, setEditKeepStored] = useState<string[]>([])
  const [editNewFiles, setEditNewFiles] = useState<File[]>([])
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Chờ xử lý'
      case 'PROCESSING':
        return 'Đang xử lý'
      case 'DONE':
        return 'Hoàn thành'
      case 'REJECTED':
        return 'Đã từ chối'
      default:
        return status
    }
  }

  const filteredRequests = useMemo(() => {
    return items.filter((req) => {
      const matchTab = activeTab === 'ALL' || req.status === activeTab
      const matchType = filterType === 'ALL' || req.type === filterType
      const matchSearch =
        req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toString().includes(searchQuery)
      return matchTab && matchType && matchSearch
    })
  }, [items, activeTab, filterType, searchQuery])



  const openDetail = (req: UserRequestRow) => {
    setSelectedRequest(req)
    setEditForm({ type: req.type, description: req.description })
    setIsEditing(false)
    setEditKeepStored(req.attachments?.map((a) => a.storedFileName) ?? [])
    setEditNewFiles([])
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedRequest(null)
    setIsEditing(false)
    setEditKeepStored([])
    setEditNewFiles([])
  }

  const handleDelete = () => {
    if (!selectedRequest) return
    Modal.confirm({
      title: 'Xóa yêu cầu?',
      content: 'Bạn có chắc chắn muốn xóa yêu cầu này? Thao tác không thể hoàn tác.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteUserRequest(selectedRequest.id)
          message.success('Đã xóa yêu cầu.')
          closeModal()
          await refreshAll()
        } catch (err) {
          message.error(extractApiError(err, 'Không thể xóa yêu cầu.'))
        }
      },
    })
  }

  const handleUpdate = async () => {
    if (!selectedRequest) return
    const totalAtt = editKeepStored.length + editNewFiles.length
    if (totalAtt > 10) {
      message.error('Tối đa 10 tệp đính kèm.')
      return
    }
    try {
      const updated = await updateUserRequest(selectedRequest.id, {
        type: editForm.type,
        description: editForm.description.trim(),
        keepStoredFileNames: editKeepStored,
        newFiles: editNewFiles.length > 0 ? editNewFiles : undefined,
      })
      message.success('Cập nhật yêu cầu thành công.')
      setIsEditing(false)
      setEditNewFiles([])
      setEditKeepStored(updated.attachments?.map((a) => a.storedFileName) ?? [])
      setSelectedRequest(updated)
      await refreshAll()
    } catch (err) {
      message.error(extractApiError(err, 'Không thể cập nhật yêu cầu.'))
    }
  }

  const handleDownloadAttachment = async (att: UserRequestAttachment) => {
    if (!selectedRequest) return
    try {
      const blob = await downloadUserRequestAttachment(selectedRequest.id, att.storedFileName)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = att.originalName || 'download'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      message.error(extractApiError(err, 'Không thể tải tệp.'))
    }
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="history-header-left">
          <h2>Lịch sử yêu cầu</h2>
          <p>Danh sách các phản hồi và yêu cầu bạn đã gửi đến Ban quản lý</p>
        </div>
        <Button type="primary" className="fix-height-32" icon={<PlusOutlined />} onClick={onCreateNew}>
          Tạo yêu cầu mới
        </Button>
      </div>

      <div className="stats-row">
        <StatCard
          title="Tổng số đã gửi"
          value={statsLoading ? '—' : stats.total}
          icon={<SendOutlined style={{ color: '#3b82f6' }} />}
        />
        <StatCard
          title="Đã hoàn thành"
          value={statsLoading ? '—' : stats.done}
          icon={<CheckCircleOutlined style={{ color: '#22c55e' }} />}
        />
        <StatCard
          title="Đang chờ / Xử lý"
          value={statsLoading ? '—' : stats.processing}
          icon={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
        />
        <StatCard
          title="Đã từ chối"
          value={statsLoading ? '—' : stats.rejected}
          icon={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
        />
      </div>

      <div className="filter-section" style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <Space wrap>
          <Input
            placeholder="Tìm theo nội dung, mã..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="fix-height-32"
            style={{ width: 250 }}
            allowClear
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            className="fix-height-32"
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'Tất cả loại' },
              { value: 'REPAIR', label: 'Sửa chữa' },
              { value: 'COMPLAINT', label: 'Khiếu nại' },
              { value: 'SUPPORT', label: 'Hỗ trợ' },
            ]}
          />
        </Space>
      </div>

      <Card className="resident-requests-card" bodyStyle={{ padding: 20 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ xử lý' },
            { key: 'PROCESSING', label: 'Đang xử lý' },
            { key: 'DONE', label: 'Hoàn thành' },
            { key: 'REJECTED', label: 'Đã từ chối' },
          ]}
        />
        <Table
          rowKey="id"
          columns={[
            {
              title: 'Mã số',
              dataIndex: 'id',
              key: 'id',
              render: (val: number) => <span style={{ fontWeight: 'bold' }}>#{val}</span>,
            },
            {
              title: 'Ngày gửi',
              key: 'createdAt',
              render: (_, req) => formatUserRequestDate(req.createdAtRaw),
            },
            {
              title: 'Loại yêu cầu',
              key: 'type',
              render: (_, req) => getUserRequestTypeLabel(req.type),
            },
            {
              title: 'Trạng thái',
              key: 'status',
              render: (_, req) => (
                <span className={`status-badge ${req.status.toLowerCase()}`}>{getStatusText(req.status)}</span>
              ),
            },
            {
              title: 'Thao tác',
              key: 'actions',
              render: (_, req) => (
                <Button type="link" size="small" onClick={() => openDetail(req)} style={{ padding: 0 }}>
                  Chi tiết
                </Button>
              ),
            },
          ]}
          dataSource={filteredRequests}
          loading={loading}
          pagination={false}
          size="small"
        />

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={currentPage}
            total={totalElements}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      </Card>
      <Modal
        className="request-history-detail-modal"
        title={`${isEditing ? 'Chỉnh sửa yêu cầu' : 'Chi tiết yêu cầu'} #${selectedRequest?.id ?? ''}`}
        open={isModalOpen && !!selectedRequest}
        onCancel={closeModal}
        width={640}
        destroyOnHidden
        styles={{ body: { colorScheme: 'light' } }}
        footer={
          selectedRequest ? (
            isEditing ? (
              <Space size={10} className="request-detail-footer-actions">
                <Button
                  className="request-detail-footer-btn fix-height-32"
                  onClick={() => {
                    setIsEditing(false)
                    setEditKeepStored(selectedRequest.attachments?.map((a) => a.storedFileName) ?? [])
                    setEditNewFiles([])
                    setEditForm({ type: selectedRequest.type, description: selectedRequest.description })
                  }}
                >
                  Hủy sửa
                </Button>
                <Button className="request-detail-footer-btn fix-height-32" type="primary" onClick={() => void handleUpdate()}>
                  Lưu thay đổi
                </Button>
              </Space>
            ) : (
              <Space size={10} className="request-detail-footer-actions">
                <Button className="request-detail-footer-btn fix-height-32" onClick={closeModal}>
                  Đóng
                </Button>
                <Button className="request-detail-footer-btn fix-height-32" danger disabled={selectedRequest.status !== 'PENDING'} onClick={handleDelete}>
                  Xóa
                </Button>
                <Button
                  className="request-detail-footer-btn fix-height-32"
                  type="primary"
                  disabled={selectedRequest.status !== 'PENDING'}
                  onClick={() => {
                    setEditForm({ type: selectedRequest.type, description: selectedRequest.description })
                    setEditKeepStored(selectedRequest.attachments?.map((a) => a.storedFileName) ?? [])
                    setEditNewFiles([])
                    setIsEditing(true)
                  }}
                >
                  Sửa
                </Button>
              </Space>
            )
          ) : null
        }
      >
        {selectedRequest && (
          <>
            <div className="request-detail-row">
              <span className="request-detail-row__label">Loại yêu cầu</span>
              <div className="request-detail-row__value">
                {isEditing ? (
                  <Select
                    className="request-detail-type-select fix-height-32"
                    classNames={{ popup: { root: 'request-detail-type-select-dropdown' } }}
                    value={editForm.type}
                    onChange={(v) => setEditForm({ ...editForm, type: v })}
                    options={[
                      { value: 'REPAIR', label: 'Sửa chữa' },
                      { value: 'COMPLAINT', label: 'Khiếu nại' },
                      { value: 'SUPPORT', label: 'Hỗ trợ' },
                    ]}
                  />
                ) : (
                  getUserRequestTypeLabel(selectedRequest.type)
                )}
              </div>
            </div>
            <div className="request-detail-row">
              <span className="request-detail-row__label">Ngày gửi</span>
              <div className="request-detail-row__value">{formatUserRequestDate(selectedRequest.createdAtRaw)}</div>
            </div>
            <div className="request-detail-row">
              <span className="request-detail-row__label">Trạng thái</span>
              <div className="request-detail-row__value">
                <span className={`status-badge ${selectedRequest.status.toLowerCase()}`}>{getStatusText(selectedRequest.status)}</span>
              </div>
            </div>
            <div className="request-detail-content-block">
              <div className="request-detail-content-block__label">Nội dung chi tiết</div>
              <div className="request-detail-content-block__field">
                {isEditing ? (
                  <Input.TextArea
                    className="request-detail-textarea"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    autoSize={{ minRows: 5, maxRows: 14 }}
                    placeholder="Mô tả chi tiết..."
                  />
                ) : (
                  <div className="request-detail-desc">{selectedRequest.description}</div>
                )}
              </div>
            </div>

            <div className="request-detail-attachments">
              <div className="request-detail-attachments__title">Tệp đính kèm</div>
              {isEditing ? (
                <div className="request-detail-attachments-edit">
                  <p className="request-detail-attachments__hint request-detail-attachments__hint--muted">
                    Giữ hoặc gỡ tệp hiện có, thêm tệp mới (JPG, PNG, PDF, tối đa 5MB/tệp, tối đa 10 tệp).
                  </p>
                  <div
                    className="request-detail-edit-upload"
                    onClick={() => editFileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') editFileInputRef.current?.click()
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    + Thêm tệp
                  </div>
                  <input
                    type="file"
                    ref={editFileInputRef}
                    className="request-detail-edit-file-input"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => {
                      const list = e.target.files ? Array.from(e.target.files) : []
                      if (list.length) setEditNewFiles((prev) => [...prev, ...list])
                      e.target.value = ''
                    }}
                  />
                  <ul className="request-detail-edit-file-list">
                    {selectedRequest.attachments
                      ?.filter((a) => editKeepStored.includes(a.storedFileName))
                      .map((att) => {
                        const isPdf = att.contentType?.toLowerCase().includes('pdf')
                        return (
                          <li key={att.storedFileName} className="request-detail-edit-file-row">
                            <div className="request-detail-attachment-item__main">
                              <span className="request-detail-attachment-item__icon" aria-hidden>
                                {isPdf ? (
                                  <FilePdfOutlined />
                                ) : att.contentType?.toLowerCase().startsWith('image/') ? (
                                  <FileImageOutlined />
                                ) : (
                                  <FileOutlined />
                                )}
                              </span>
                              <div className="request-detail-attachment-item__meta">
                                <span className="request-detail-attachment-item__name">{att.originalName}</span>
                                <span className="request-detail-attachment-item__size">{formatAttachmentSize(att.sizeBytes)}</span>
                              </div>
                            </div>
                            <div className="request-detail-attachment-item__preview">
                              <AttachmentPreview requestId={selectedRequest.id} att={att} />
                            </div>
                            <div className="request-detail-edit-file-actions">
                              <Button type="link" size="small" onClick={() => void handleDownloadAttachment(att)}>
                                Tải xuống
                              </Button>
                              <Button
                                type="link"
                                size="small"
                                danger
                                onClick={() => setEditKeepStored((prev) => prev.filter((s) => s !== att.storedFileName))}
                              >
                                Gỡ
                              </Button>
                            </div>
                          </li>
                        )
                      })}
                    {editNewFiles.map((file, idx) => (
                      <li key={`new-${idx}-${file.name}-${file.size}-${file.lastModified}`} className="request-detail-edit-file-row request-detail-edit-file-row--new">
                        <span className="request-detail-attachment-item__name">{file.name}</span>
                        <span className="request-detail-attachment-item__size">{formatAttachmentSize(file.size)}</span>
                        <Button type="link" size="small" danger onClick={() => setEditNewFiles((prev) => prev.filter((_, i) => i !== idx))}>
                          Gỡ
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {editKeepStored.length === 0 && editNewFiles.length === 0 && (
                    <p className="request-detail-attachments__empty">Chưa có tệp đính kèm.</p>
                  )}
                </div>
              ) : selectedRequest.attachments?.length ? (
                <ul className="request-detail-attachments__list">
                  {selectedRequest.attachments.map((att) => {
                    const isPdf = att.contentType?.toLowerCase().includes('pdf')
                    return (
                      <li key={att.storedFileName} className="request-detail-attachment-item">
                        <div className="request-detail-attachment-item__main">
                          <span className="request-detail-attachment-item__icon" aria-hidden>
                            {isPdf ? <FilePdfOutlined /> : att.contentType?.toLowerCase().startsWith('image/') ? <FileImageOutlined /> : <FileOutlined />}
                          </span>
                          <div className="request-detail-attachment-item__meta">
                            <span className="request-detail-attachment-item__name">{att.originalName}</span>
                            <span className="request-detail-attachment-item__size">{formatAttachmentSize(att.sizeBytes)}</span>
                          </div>
                        </div>
                        <div className="request-detail-attachment-item__preview">
                          <AttachmentPreview requestId={selectedRequest.id} att={att} />
                        </div>
                        <Button type="link" size="small" onClick={() => void handleDownloadAttachment(att)}>
                          Tải xuống
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="request-detail-attachments__empty">Không có tệp đính kèm.</p>
              )}
            </div>

            {selectedRequest.status !== 'PENDING' && !isEditing && (
              <p className="request-detail-note">Chỉ có thể sửa hoặc xóa yêu cầu ở trạng thái Chờ xử lý.</p>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

export default RequestHistory
