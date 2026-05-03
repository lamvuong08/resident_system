import React, { useRef, useState } from 'react'
import { message } from 'antd'
import { USER_REQUEST_TYPE, type UserRequestTypeValue } from '../../../types/userSupport'
import { createUserRequest } from '../../../utils/userSupportApi'
import { extractApiError } from '../../../utils/api'
import '../../../styles/resident-support.css'

type CreateRequestProps = {
  onSuccess: () => void | Promise<void>
}

const CreateRequest: React.FC<CreateRequestProps> = ({ onSuccess }) => {
  const [requestType, setRequestType] = useState<UserRequestTypeValue>(USER_REQUEST_TYPE.REPAIR)
  const [description, setDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files)
      setSelectedFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await createUserRequest({
        type: requestType,
        description: description.trim(),
        files: selectedFiles.length > 0 ? selectedFiles : undefined,
      })
      message.success('Gửi yêu cầu thành công.')
      setDescription('')
      setSelectedFiles([])
      await onSuccess()
    } catch (err) {
      message.error(extractApiError(err, 'Không thể gửi yêu cầu. Vui lòng thử lại.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="support-container support-container--tab">
      <div className="support-card">
        <form onSubmit={handleSubmit} className="support-form">
          <div className="form-group">
            <label>
              Loại yêu cầu <span className="required">*</span>
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as UserRequestTypeValue)}
              required
              disabled={isSubmitting}
            >
              <option value={USER_REQUEST_TYPE.REPAIR}>Sửa chữa</option>
              <option value={USER_REQUEST_TYPE.COMPLAINT}>Khiếu nại</option>
              <option value={USER_REQUEST_TYPE.SUPPORT}>Hỗ trợ chung</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Nội dung chi tiết <span className="required">*</span>
            </label>
            <textarea
              rows={5}
              placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <p className="helper-text">Cung cấp thông tin chi tiết giúp chúng tôi xử lý nhanh hơn.</p>
          </div>

          <div className="form-group">
            <label>Đính kèm hình ảnh / Tài liệu</label>
            <div
              className="upload-zone"
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
              role="button"
              tabIndex={0}
            >
              <p className="upload-title">Nhấp để tải lên hoặc kéo thả tệp tại đây</p>
              <p className="upload-subtitle">Hỗ trợ JPG, PNG, PDF (Tối đa 5MB)</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept=".jpg,.png,.pdf"
                hidden
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="file-preview-list">
                {selectedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="file-preview-item">
                    <span className="file-name">{file.name}</span>
                    <button type="button" onClick={() => removeFile(index)} disabled={isSubmitting}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button
              type="button"
              className="btn-cancel"
              disabled={isSubmitting}
              onClick={() => {
                setDescription('')
                setSelectedFiles([])
              }}
            >
              Hủy bỏ
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateRequest
