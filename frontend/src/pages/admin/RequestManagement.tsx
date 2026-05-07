import React, { useEffect, useState } from "react";
// Import trực tiếp file Global CSS đã được cách ly class
import "../../styles/admin-request.css";
// Bắt buộc dùng 'import type' do cấu hình verbatimModuleSyntax của TypeScript
import type { PageResponse, UserRequestResponse } from "../../types/api";
import api from "../../utils/api";

const RequestManagement: React.FC = () => {
  const [requests, setRequests] = useState<UserRequestResponse[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [totalElements, setTotalElements] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>("");
  const [filterApartmentCode, setFilterApartmentCode] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Lấy dữ liệu từ Backend
  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      // Dùng 'api' thay vì axios. Tự động gắn token.
      const response = await api.get<unknown>(
        `/admin/requests?apartmentCode=${filterApartmentCode}&size=1000&sort=createdAt,desc`,
      );

      const responseData = (response as any).data || response; // Dự phòng cấu trúc bọc data
      console.log("DEBUG API RESPONSE:", responseData);

      // TYPE GUARD: Kiểm tra cấu trúc dữ liệu an toàn
      if (Array.isArray(responseData)) {
        setRequests(responseData as UserRequestResponse[]);
        setTotalElements(responseData.length);
      } else if (responseData && typeof responseData === "object") {
        const pageData = responseData as PageResponse<UserRequestResponse>;
        setRequests(Array.isArray(pageData.content) ? pageData.content : []);
        setTotalElements(pageData.totalElements || 0);
      } else {
        setRequests([]);
        setTotalElements(0);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      alert("Không thể tải danh sách yêu cầu. Vui lòng kiểm tra console.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterApartmentCode]);

  // [MỚI] Tự động reset về trang 1 mỗi khi đổi Tab trạng thái hoặc lọc Căn hộ
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterApartmentCode]);

  const handleSearch = () => {
    setFilterApartmentCode(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Format Mã yêu cầu: #REQ-YYYY-XXX
  const formatReqId = (id: number, dateStr: string) => {
    if (!dateStr) return `#REQ-${id}`;
    const year = new Date(dateStr).getFullYear();
    return `#REQ-${year}-${String(id).padStart(3, "0")}`;
  };

  // Cập nhật trạng thái
  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      // Dùng api.put gọn gàng
      await api.put(`/admin/requests/${id}/status?status=${newStatus}`);
      fetchRequests(); // Reload data sau khi update
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Cập nhật trạng thái thất bại!");
    }
  };

  // UI Config cho Loại yêu cầu
  const getTypeConfig = (type: string) => {
    switch (type) {
      case "REPAIR":
        return { text: "Sửa chữa", bg: "#e0f2fe", color: "#0284c7" };
      case "COMPLAINT":
        return { text: "Khiếu nại", bg: "#fee2e2", color: "#dc2626" };
      case "SUPPORT":
        return { text: "Hỗ trợ", bg: "#f3e8ff", color: "#7e22ce" };
      default:
        return { text: "Cập nhật TT", bg: "#e0f2fe", color: "#0284c7" };
    }
  };

  // UI Config cho Trạng thái
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return { bg: "#fef3c7", color: "#d97706" };
      case "PROCESSING":
        return { bg: "#e0f2fe", color: "#0284c7" };
      case "DONE":
        return { bg: "#dcfce7", color: "#16a34a" };
      case "REJECTED":
        return { bg: "#fee2e2", color: "#dc2626" };
      default:
        return { bg: "#f8f9fa", color: "#495057" };
    }
  };

  // [MỚI] LOGIC PHÂN TRANG
  // 1. Lọc dữ liệu theo Tab hiện tại
  const filteredRequests = requests.filter(
    (req) => activeTab === "ALL" || req.status === activeTab,
  );

  // 2. Tính toán tổng số trang
  const totalFiltered = filteredRequests.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);

  // 3. Cắt (Slice) mảng dữ liệu để chỉ lấy đúng 10 item cho trang hiện tại
  const pagedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="req-container">
      <div className="req-header">
        <div>
          <h1 className="req-title">Danh sách yêu cầu</h1>
          <p className="req-subtitle">
            Quản lý và xử lý các yêu cầu thay đổi thông tin từ cư dân
          </p>
        </div>
      </div>

      <div className="req-table-card">
        {/* Tabs */}
        <div className="req-tabs">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "PENDING", label: "Chờ duyệt" },
            { id: "PROCESSING", label: "Đang xử lý" },
            { id: "DONE", label: "Đã hoàn thành" },
            { id: "REJECTED", label: "Đã từ chối" },
          ].map((tab) => (
            <div
              key={tab.id}
              className={`req-tab ${activeTab === tab.id ? "req-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="req-filter-section">
          <input
            type="text"
            className="req-search-input"
            placeholder="Nhập mã căn hộ (VD: A1-0101)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="req-search-btn" onClick={handleSearch}>
            Tìm kiếm
          </button>
          {filterApartmentCode && (
            <button
              style={{
                border: "none",
                background: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
              onClick={() => {
                setSearchInput("");
                setFilterApartmentCode("");
              }}
            >
              Xóa lọc
            </button>
          )}
        </div>
        {/* Bảng Dữ Liệu */}
        {isLoading ? (
          <div
            style={{ padding: "40px", textAlign: "center", color: "#6c757d" }}
          >
            Đang tải dữ liệu...
          </div>
        ) : (
          <table className="req-table">
            <thead>
              <tr>
                <th>Mã yêu cầu</th>
                <th>Căn hộ</th>
                <th>Loại yêu cầu</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pagedRequests.map((req) => {
                const typeCfg = getTypeConfig(req.type);
                const statusColors = getStatusColor(req.status);

                return (
                  <tr key={req.id}>
                    <td className="req-id">
                      {formatReqId(req.id, req.createdAt)}
                    </td>

                    <td>
                      <div className="req-apartment-info">
                        <div className="req-apartment-avatar">
                          {req.apartmentCode
                            ? req.apartmentCode.substring(0, 2)
                            : "NA"}
                        </div>
                        <div>
                          <div className="req-apartment-label">Căn hộ</div>
                          <div className="req-apartment-sub">
                            Phòng {req.apartmentCode || "Trống"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className="req-type-badge"
                        style={{
                          backgroundColor: typeCfg.bg,
                          color: typeCfg.color,
                        }}
                      >
                        {typeCfg.text}
                      </span>
                    </td>

                    <td>
                      <div style={{ color: "#1a1b1e", fontWeight: 500 }}>
                        {req.createdAt
                          ? new Date(req.createdAt).toLocaleDateString("en-GB")
                          : "N/A"}
                      </div>
                      <div style={{ color: "#6c757d", fontSize: "12px" }}>
                        {req.createdAt
                          ? new Date(req.createdAt).toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : ""}
                      </div>
                    </td>

                    <td>
                      <select
                        className="req-status-select"
                        style={{
                          backgroundColor: statusColors.bg,
                          color: statusColors.color,
                          borderColor: statusColors.color,
                        }}
                        value={req.status}
                        onChange={(e) =>
                          handleStatusChange(req.id, e.target.value)
                        }
                      >
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="PROCESSING">Đang xử lý</option>
                        <option value="DONE">Hoàn thành</option>
                        <option value="REJECTED">Từ chối</option>
                      </select>
                    </td>
                  </tr>
                );
              })}

              {pagedRequests.length === 0 && (
                <tr>
                  {/* Chú ý: Đổi colSpan từ 6 xuống 5 vì bảng chỉ còn 5 cột */}
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    Không có yêu cầu nào trong danh sách này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* [MỚI] THANH ĐIỀU HƯỚNG PHÂN TRANG */}
        <div className="req-pagination-wrapper">
          <div className="req-pagination-info">
            Hiển thị <b>{totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalFiltered)}</b> của <b>{totalFiltered}</b> yêu cầu
          </div>
          <div className="req-pagination-controls">
            <button
              className="req-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Trước
            </button>
            <span className="req-page-current">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              className="req-page-btn"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestManagement;
1;
