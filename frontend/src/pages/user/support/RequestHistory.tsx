import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Modal, Select, Space, message } from 'antd'
import { FileImageOutlined, FileOutlined, FilePdfOutlined } from '@ant-design/icons'
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
      .catch(() => {})
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
  totalPages,
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
  /** storedFileName của tệp đã có trên server — còn trong danh sách thì được giữ khi lưu */
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

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(startIndex + filteredRequests.length - 1, totalElements)

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
        <button type="button" className="btn-create-new" onClick={onCreateNew}>
          Tạo yêu cầu mới
        </button>
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

      <div className="filter-section">
        <div className="filter-tabs">
          <button type="button" className={`filter-tab ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>
            Tất cả
          </button>
          <button type="button" className={`filter-tab ${activeTab === 'PENDING' ? 'active' : ''}`} onClick={() => setActiveTab('PENDING')}>
            Chờ xử lý
          </button>
          <button type="button" className={`filter-tab ${activeTab === 'PROCESSING' ? 'active' : ''}`} onClick={() => setActiveTab('PROCESSING')}>
            Đang xử lý
          </button>
          <button type="button" className={`filter-tab ${activeTab === 'DONE' ? 'active' : ''}`} onClick={() => setActiveTab('DONE')}>
            Hoàn thành
          </button>
          <button type="button" className={`filter-tab ${activeTab === 'REJECTED' ? 'active' : ''}`} onClick={() => setActiveTab('REJECTED')}>
            Đã từ chối
          </button>
        </div>
        <div className="filter-actions">
          <input
            type="text"
            className="filter-search"
            placeholder="Tìm theo nội dung, mã..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="ALL">Tất cả loại</option>
            <option value="REPAIR">Sửa chữa</option>
            <option value="COMPLAINT">Khiếu nại</option>
            <option value="SUPPORT">Hỗ trợ</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        <table className="history-table">
          <thead>
            <tr>
              <th>Mã số</th>
              <th>Ngày gửi</th>
              <th>Loại yêu cầu</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td className="font-bold">#{req.id}</td>
                  <td>{formatUserRequestDate(req.createdAtRaw)}</td>
                  <td>{getUserRequestTypeLabel(req.type)}</td>
                  <td>
                    <span className={`status-badge ${req.status.toLowerCase()}`}>{getStatusText(req.status)}</span>
                  </td>
                  <td>
                    <button type="button" className="btn-detail" onClick={() => openDetail(req)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-state">
                  Không có yêu cầu nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pagination-container">
          <div className="pagination-info">
            Hiển thị {totalElements === 0 ? 0 : startIndex} đến {endIndex} của {totalElements} kết quả
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              className="page-btn text-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Trang trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`page-btn number-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              className="page-btn text-btn"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

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
                  className="request-detail-footer-btn"
                  onClick={() => {
                    setIsEditing(false)
                    setEditKeepStored(selectedRequest.attachments?.map((a) => a.storedFileName) ?? [])
                    setEditNewFiles([])
                    setEditForm({ type: selectedRequest.type, description: selectedRequest.description })
                  }}
                >
                  Hủy sửa
                </Button>
                <Button className="request-detail-footer-btn" type="primary" onClick={() => void handleUpdate()}>
                  Lưu thay đổi
                </Button>
              </Space>
            ) : (
              <Space size={10} className="request-detail-footer-actions">
                <Button className="request-detail-footer-btn" onClick={closeModal}>
                  Đóng
                </Button>
                <Button className="request-detail-footer-btn" danger disabled={selectedRequest.status !== 'PENDING'} onClick={handleDelete}>
                  Xóa
                </Button>
                <Button
                  className="request-detail-footer-btn"
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
                    className="request-detail-type-select"
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
