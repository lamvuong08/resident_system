import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/resident-support.css";

export const RequestType = {
  REPAIR: "REPAIR",
  COMPLAINT: "COMPLAINT",
  SUPPORT: "SUPPORT",
} as const;

export type RequestTypeValues = (typeof RequestType)[keyof typeof RequestType];

const ResidentSupport: React.FC = () => {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<RequestTypeValues>(
    RequestType.REPAIR,
  );
  const [description, setDescription] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Thêm state loading
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      type: requestType,
      description: description,
    };

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:8080/api/user/send-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        alert("Gửi yêu cầu thành công!");
        setDescription("");
        setSelectedFiles([]);
        navigate("/user/history");
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(
          "Lỗi khi gửi yêu cầu: " +
            (errorData.message || "Vui lòng thử lại sau."),
        );
      }
    } catch (error) {
      console.error("Lỗi kết nối server:", error);
      alert(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc Backend.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="support-container">
      <div className="support-header">
        <div className="header-text">
          <h2>Gửi yêu cầu hỗ trợ</h2>
          <p>
            Ban quản lý sẽ phản hồi yêu cầu của bạn trong thời gian sớm nhất
          </p>
        </div>
      </div>

      <div className="support-card">
        <form onSubmit={handleSubmit} className="support-form">
          <div className="form-group">
            <label>
              Loại yêu cầu <span className="required">*</span>
            </label>
            <select
              value={requestType}
              onChange={(e) =>
                setRequestType(e.target.value as RequestTypeValues)
              }
              required
              disabled={isSubmitting}
            >
              <option value={RequestType.REPAIR}>Sửa chữa</option>
              <option value={RequestType.COMPLAINT}>Khiếu nại</option>
              <option value={RequestType.SUPPORT}>Hỗ trợ chung</option>
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
            ></textarea>
            <p className="helper-text">
              Cung cấp thông tin chi tiết giúp chúng tôi xử lý nhanh hơn.
            </p>
          </div>

          <div className="form-group">
            <label>Đính kèm hình ảnh / Tài liệu</label>
            <div
              className="upload-zone"
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
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

            {selectedFiles.length > 0 && (
              <div className="file-preview-list">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-preview-item">
                    <span className="file-name">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={isSubmitting}
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
            <button
              type="button"
              className="btn-cancel"
              disabled={isSubmitting}
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
