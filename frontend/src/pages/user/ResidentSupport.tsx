import React, { useRef, useState } from "react";
import "../../styles/resident-support.css";

export const RequestType = {
  REPAIR: "REPAIR",
  COMPLAINT: "COMPLAINT",
  SUPPORT: "SUPPORT",
} as const;

export type RequestTypeValues = (typeof RequestType)[keyof typeof RequestType];

const ResidentSupport: React.FC = () => {
  const [requestType, setRequestType] = useState<RequestTypeValues>(
    RequestType.REPAIR,
  );
  const [description, setDescription] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Payload chuẩn bị gửi Backend:", {
      type: requestType,
      description: description,
      files: selectedFiles.map((f) => f.name),
    });
    alert("Đã ghi nhận form (UI Mode). Xem console để biết payload.");
  };

  return (
    <div className="support-container">
      <div className="support-header">
        <div className="header-text">
          <h2>Gửi yêu cầu hỗ trợ</h2>
          <p>Ban quản lý sẽ phản hồi yêu cầu của bạn trong thời gian sớm nhất</p>
        </div>
      </div>

      <div className="support-card">
        <form onSubmit={handleSubmit} className="support-form">
          
          {/* Loại yêu cầu */}
          <div className="form-group">
            <label>
              Loại yêu cầu <span className="required">*</span>
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as RequestTypeValues)}
              required
            >
              <option value={RequestType.REPAIR}>Sửa chữa</option>
              <option value={RequestType.COMPLAINT}>Khiếu nại</option>
              <option value={RequestType.SUPPORT}>Hỗ trợ chung</option>
            </select>
          </div>

          {/* Nội dung chi tiết */}
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
            ></textarea>
            <p className="helper-text">
              Cung cấp thông tin chi tiết giúp chúng tôi xử lý nhanh hơn.
            </p>
          </div>

          {/* Khu vực Upload Ảnh */}
          <div className="form-group">
            <label>Đính kèm hình ảnh / Tài liệu</label>
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="upload-title">
                Nhấp để tải lên hoặc kéo thả tệp tại đây
              </p>
              <p className="upload-subtitle">
                Hỗ trợ JPG, PNG, PDF (Tối đa 5MB)
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept=".jpg,.png,.pdf"
                hidden
              />
            </div>

            {/* Preview files */}
            {selectedFiles.length > 0 && (
              <div className="file-preview-list">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-preview-item">
                    <span className="file-name">{file.name}</span>
                    <button type="button" onClick={() => removeFile(index)}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="submit" className="btn-submit">
              Gửi yêu cầu
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => {
                setDescription("");
                setSelectedFiles([]);
              }}
            >
              Hủy bỏ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResidentSupport;