import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/resident-request-history.css";
import { RequestType, type RequestTypeValues } from "./ResidentSupport";

interface RequestItem {
  id: number;
  type: RequestTypeValues;
  description: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "REJECTED";
  createdAt: string;
}

const ResidentRequestHistory: React.FC = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const pageSize = 5;

  const [globalStats, setGlobalStats] = useState({ total: 0, done: 0, processing: 0, rejected: 0 });

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({ type: "REPAIR", description: "" });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8080/api/user/history/stats", {
        method: "GET",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (response.ok) {
        const data = await response.json();
        setGlobalStats(data);
      }
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `http://localhost:8080/api/user/history?page=${currentPage - 1}&size=${pageSize}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (response.ok) {
        const result = await response.json();
        const formattedData = result.content.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt).toLocaleString("vi-VN", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit"
          }),
        }));
        setRequests(formattedData);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
      }
    } catch (error) {
      console.error("Lỗi Server:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [currentPage]);

  const handleDelete = async () => {
    if (!selectedRequest) return;
    const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa yêu cầu này?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/user/history/${selectedRequest.id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      if (response.ok) {
        alert("Xóa yêu cầu thành công!");
        closeModal();
        fetchHistory();
        fetchStats(); 
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert("Lỗi khi xóa: " + (errorData.message || "Không thể xóa."));
      }
    } catch (error) {
      alert("Lỗi kết nối khi xóa.");
    }
  };

  const handleUpdate = async () => {
    if (!selectedRequest) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/user/history/${selectedRequest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          type: editForm.type,
          description: editForm.description,
        }),
      });

      if (response.ok) {
        alert("Cập nhật yêu cầu thành công!");
        setIsEditing(false); 
        fetchHistory(); 

        setSelectedRequest({
          ...selectedRequest,
          type: editForm.type as RequestTypeValues,
          description: editForm.description
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert("Lỗi khi cập nhật: " + (errorData.message || "Không thể sửa."));
      }
    } catch (error) {
      alert("Lỗi kết nối khi cập nhật.");
    }
  };

  // ================= HELPER FUNCTIONS =================

  const openDetail = (req: RequestItem) => {
    setSelectedRequest(req);
    setEditForm({ type: req.type, description: req.description });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setIsEditing(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING": return "Chờ xử lý";
      case "PROCESSING": return "Đang xử lý";
      case "DONE": return "Hoàn thành";
      case "REJECTED": return "Đã từ chối";
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "REPAIR": return "Sửa chữa";
      case "COMPLAINT": return "Khiếu nại";
      case "SUPPORT": return "Hỗ trợ";
      default: return type;
    }
  };

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

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + filteredRequests.length - 1, totalElements);

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="header-left">
          <h2>Lịch sử yêu cầu</h2>
          <p>Danh sách các phản hồi và yêu cầu bạn đã gửi đến Ban quản lý</p>
        </div>
        <button className="btn-create-new" onClick={() => navigate("/user/send-request")}>
          Tạo yêu cầu mới
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Tổng số đã gửi</p>
          <p className="stat-value total">{globalStats.total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Đã hoàn thành</p>
          <p className="stat-value done">{globalStats.done}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Đang chờ / Xử lý</p>
          <p className="stat-value processing">{globalStats.processing}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Đã từ chối</p>
          <p className="stat-value rejected">{globalStats.rejected}</p>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-tabs">
          <button className={`filter-tab ${activeTab === "ALL" ? "active" : ""}`} onClick={() => setActiveTab("ALL")}>Tất cả</button>
          <button className={`filter-tab ${activeTab === "PENDING" ? "active" : ""}`} onClick={() => setActiveTab("PENDING")}>Chờ xử lý</button>
          <button className={`filter-tab ${activeTab === "PROCESSING" ? "active" : ""}`} onClick={() => setActiveTab("PROCESSING")}>Đang xử lý</button>
          <button className={`filter-tab ${activeTab === "DONE" ? "active" : ""}`} onClick={() => setActiveTab("DONE")}>Hoàn thành</button>
          <button className={`filter-tab ${activeTab === "REJECTED" ? "active" : ""}`} onClick={() => setActiveTab("REJECTED")}>Đã từ chối</button>
        </div>
        <div className="filter-actions">
          <input type="text" className="filter-search" placeholder="Tìm theo nội dung, mã..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
            {isLoading ? (
              <tr><td colSpan={5} className="empty-state">Đang tải dữ liệu...</td></tr>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td className="font-bold">#{req.id}</td>
                  <td>{req.createdAt}</td>
                  <td>{getTypeText(req.type)}</td>
                  <td><span className={`status-badge ${req.status.toLowerCase()}`}>{getStatusText(req.status)}</span></td>
                  <td><button className="btn-detail" onClick={() => openDetail(req)}>Chi tiết</button></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="empty-state">Không có yêu cầu nào phù hợp.</td></tr>
            )}
          </tbody>
        </table>

        <div className="pagination-container">
          <div className="pagination-info">
            Hiển thị {totalElements === 0 ? 0 : startIndex} đến {endIndex} của {totalElements} kết quả
          </div>
          <div className="pagination-controls">
            <button className="page-btn text-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Trang trước</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} className={`page-btn number-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
            <button className="page-btn text-btn" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Trang sau</button>
          </div>
        </div>
      </div>

      {isModalOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditing ? "Chỉnh sửa yêu cầu" : "Chi tiết yêu cầu"} #{selectedRequest.id}</h3>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>Loại yêu cầu:</label>
                {isEditing ? (
                  <select 
                    value={editForm.type} 
                    onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                    style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  >
                    <option value="REPAIR">Sửa chữa</option>
                    <option value="COMPLAINT">Khiếu nại</option>
                    <option value="SUPPORT">Hỗ trợ</option>
                  </select>
                ) : (
                  <span>{getTypeText(selectedRequest.type)}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Ngày gửi:</label>
                <span>{selectedRequest.createdAt}</span>
              </div>
              <div className="detail-row">
                <label>Trạng thái:</label>
                <span className={`status-badge ${selectedRequest.status.toLowerCase()}`}>
                  {getStatusText(selectedRequest.status)}
                </span>
              </div>
              <div className="detail-row vertical">
                <label>Nội dung chi tiết:</label>
                {isEditing ? (
                  <textarea 
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows={4}
                    style={{ width: "100%", padding: "10px", marginTop: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                ) : (
                  <div className="detail-desc">{selectedRequest.description}</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {isEditing ? (
                <>
                  <button className="btn-modal-edit" style={{ backgroundColor: "#10b981", color: "white" }} onClick={handleUpdate}>
                    Lưu thay đổi
                  </button>
                  <button className="btn-modal-cancel" onClick={() => setIsEditing(false)}>
                    Hủy sửa
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-modal-edit" disabled={selectedRequest.status !== "PENDING"} onClick={() => setIsEditing(true)}>
                    Sửa
                  </button>
                  <button className="btn-modal-delete" disabled={selectedRequest.status !== "PENDING"} onClick={handleDelete}>
                    Xóa
                  </button>
                  <button className="btn-modal-cancel" onClick={closeModal}>
                    Đóng
                  </button>
                </>
              )}
            </div>
            {selectedRequest.status !== "PENDING" && !isEditing && (
              <p className="modal-note">* Chỉ có thể Sửa/Xóa yêu cầu ở trạng thái Chờ xử lý.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentRequestHistory;