import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom"; // Thêm import này
import "../../styles/resident-request-history.css";
import { RequestType, type RequestTypeValues } from "./ResidentSupport";

interface RequestItem {
  id: number;
  type: RequestTypeValues;
  description: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "REJECTED";
  createdAt: string;
}

const MOCK_DATA: RequestItem[] = [
  {
    id: 101,
    type: "REPAIR",
    description: "Hỏng vòi nước nhà vệ sinh",
    status: "PENDING",
    createdAt: "2024-03-20 09:30",
  },
  {
    id: 102,
    type: "COMPLAINT",
    description: "Hàng xóm ồn ào lúc nửa đêm",
    status: "PROCESSING",
    createdAt: "2024-03-18 22:15",
  },
  {
    id: 103,
    type: "SUPPORT",
    description: "Hỏi về thủ tục đăng ký gửi xe",
    status: "DONE",
    createdAt: "2024-03-15 14:00",
  },
  {
    id: 104,
    type: "REPAIR",
    description: "Bóng đèn hành lang tầng 5 bị cháy",
    status: "DONE",
    createdAt: "2024-03-10 08:00",
  },
  {
    id: 105,
    type: "COMPLAINT",
    description: "Mùi rác bốc lên từ hầm",
    status: "REJECTED",
    createdAt: "2024-03-05 10:20",
  },
  {
    id: 106,
    type: "SUPPORT",
    description: "Xin cấp lại thẻ thang máy",
    status: "PENDING",
    createdAt: "2024-03-01 15:45",
  },
];

const ResidentRequestHistory: React.FC = () => {
  const navigate = useNavigate(); // Khởi tạo điều hướng
  const [requests] = useState<RequestItem[]>(MOCK_DATA);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterType]);

  const openDetail = (req: RequestItem) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Chờ xử lý";
      case "PROCESSING":
        return "Đang xử lý";
      case "DONE":
        return "Hoàn thành";
      case "REJECTED":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "REPAIR":
        return "Sửa chữa";
      case "COMPLAINT":
        return "Khiếu nại";
      case "SUPPORT":
        return "Hỗ trợ";
      default:
        return type;
    }
  };

  const stats = useMemo(() => {
    return {
      total: requests.length,
      done: requests.filter((r) => r.status === "DONE").length,
      processing: requests.filter(
        (r) => r.status === "PENDING" || r.status === "PROCESSING",
      ).length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchTab = activeTab === "ALL" || req.status === activeTab;
      const matchType = filterType === "ALL" || req.type === filterType;
      const matchSearch =
        req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toString().includes(searchQuery);
      return matchTab && matchType && matchSearch;
    });
  }, [requests, activeTab, filterType, searchQuery]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRequests.length);
  const currentData = filteredRequests.slice(startIndex, endIndex);

  return (
    <div className="history-container">
      {/* Header được cấu trúc lại để chứa nút bấm */}
      <div className="history-header">
        <div className="header-left">
          <h2>Lịch sử yêu cầu</h2>
          <p>Danh sách các phản hồi và yêu cầu bạn đã gửi đến Ban quản lý</p>
        </div>
        <button
          className="btn-create-new"
          onClick={() => navigate("/user/send-request")}
        >
          Tạo yêu cầu mới
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Tổng số đã gửi</p>
          <p className="stat-value total">{stats.total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Đã hoàn thành</p>
          <p className="stat-value done">{stats.done}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Đang chờ / Xử lý</p>
          <p className="stat-value processing">{stats.processing}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Đã từ chối</p>
          <p className="stat-value rejected">{stats.rejected}</p>
        </div>
      </div>

      {/* Giữ nguyên phần Filter và Table phía dưới... */}
      <div className="filter-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === "ALL" ? "active" : ""}`}
            onClick={() => setActiveTab("ALL")}
          >
            Tất cả
          </button>
          <button
            className={`filter-tab ${activeTab === "PENDING" ? "active" : ""}`}
            onClick={() => setActiveTab("PENDING")}
          >
            Chờ xử lý
          </button>
          <button
            className={`filter-tab ${activeTab === "PROCESSING" ? "active" : ""}`}
            onClick={() => setActiveTab("PROCESSING")}
          >
            Đang xử lý
          </button>
          <button
            className={`filter-tab ${activeTab === "DONE" ? "active" : ""}`}
            onClick={() => setActiveTab("DONE")}
          >
            Hoàn thành
          </button>
          <button
            className={`filter-tab ${activeTab === "REJECTED" ? "active" : ""}`}
            onClick={() => setActiveTab("REJECTED")}
          >
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
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Tất cả loại</option>
            <option value={RequestType.REPAIR}>Sửa chữa</option>
            <option value={RequestType.COMPLAINT}>Khiếu nại</option>
            <option value={RequestType.SUPPORT}>Hỗ trợ</option>
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
            {currentData.length > 0 ? (
              currentData.map((req) => (
                <tr key={req.id}>
                  <td className="font-bold">#{req.id}</td>
                  <td>{req.createdAt}</td>
                  <td>{getTypeText(req.type)}</td>
                  <td>
                    <span
                      className={`status-badge ${req.status.toLowerCase()}`}
                    >
                      {getStatusText(req.status)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-detail"
                      onClick={() => openDetail(req)}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-state">
                  Không tìm thấy yêu cầu nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pagination-container">
          <div className="pagination-info">
            Hiển thị {filteredRequests.length === 0 ? 0 : startIndex + 1} đến{" "}
            {endIndex} của {filteredRequests.length} kết quả
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn text-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Trang trước
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-btn number-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="page-btn text-btn"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal... */}
      {isModalOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Chi tiết yêu cầu #{selectedRequest.id}</h3>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>Loại yêu cầu:</label>
                <span>{getTypeText(selectedRequest.type)}</span>
              </div>
              <div className="detail-row">
                <label>Ngày gửi:</label>
                <span>{selectedRequest.createdAt}</span>
              </div>
              <div className="detail-row">
                <label>Trạng thái:</label>
                <span
                  className={`status-badge ${selectedRequest.status.toLowerCase()}`}
                >
                  {getStatusText(selectedRequest.status)}
                </span>
              </div>
              <div className="detail-row vertical">
                <label>Nội dung chi tiết:</label>
                <div className="detail-desc">{selectedRequest.description}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-modal-edit"
                disabled={selectedRequest.status !== "PENDING"}
              >
                Sửa
              </button>
              <button
                className="btn-modal-delete"
                disabled={selectedRequest.status !== "PENDING"}
              >
                Xóa
              </button>
              <button className="btn-modal-cancel" onClick={closeModal}>
                Hủy
              </button>
            </div>
            {selectedRequest.status !== "PENDING" && (
              <p className="modal-note">
                * Chỉ có thể Sửa/Xóa yêu cầu ở trạng thái Chờ xử lý.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentRequestHistory;
