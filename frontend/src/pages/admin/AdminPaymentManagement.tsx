import {
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useEffect, useState } from "react";
import "../../styles/admin-payment.css";
import axiosInstance from "../../utils/api";

const { Option } = Select;

// Định nghĩa kiểu dữ liệu trả về từ Backend
interface AdminBillDetailResponse {
  detailId: number;
  apartmentCode: string;
  billingMonth: string;
  feeTypeName: string;
  amount: number;
  status: "PAID" | "UNPAID" | "PENDING";
  billId: number;
  createdAt: string;
  dueDate: string;
}

// Kiểu dữ liệu phân trang của Spring Boot
interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatDate = (isoString: string | null) => {
  if (!isoString) return "Không có hạn";
  const date = new Date(isoString);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const AdminPaymentManagement: React.FC = () => {
  // State quản lý dữ liệu bảng
  const [data, setData] = useState<AdminBillDetailResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  // State quản lý Phân trang (Antd bắt đầu từ 1, Spring bắt đầu từ 0)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // Cố định 5 dòng 1 trang theo yêu cầu

  // State quản lý Bộ lọc
  const [filterApartmentCode, setFilterApartmentCode] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Hàm gọi API
  const fetchBills = async (page: number) => {
    setLoading(true);
    try {
      // Build object params, loại bỏ các giá trị null/undefined
      const params: Record<string, any> = {
        page: page - 1, // Chuyển đổi thành 0-based index cho Spring
        size: pageSize,
      };

      if (filterApartmentCode) params.apartmentCode = filterApartmentCode;
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      if (filterStatus) params.status = filterStatus;

      const response = await axiosInstance.get<
        SpringPage<AdminBillDetailResponse>
      >("/bills/admin/details", { params });

      setData(response.data.content);
      setTotalElements(response.data.totalElements);
    } catch (error) {
      console.error("Lỗi khi tải danh sách hóa đơn:", error);
      message.error("Không thể tải dữ liệu hóa đơn.");
    } finally {
      setLoading(false);
    }
  };

  // Tự động fetch khi Load trang hoặc khi đổi Trang (currentPage)
  useEffect(() => {
    fetchBills(currentPage);
  }, [currentPage]);

  // Hành động khi nhấn nút Lọc
  const handleFilter = () => {
    if (currentPage === 1) {
      fetchBills(1);
    } else {
      setCurrentPage(1); // Set về 1 sẽ tự động trigger useEffect
    }
  };

  // Hành động khi nhấn Xóa bộ lọc
  const handleClearFilter = () => {
    setFilterApartmentCode("");
    setFilterMonth(null);
    setFilterYear(null);
    setFilterStatus(null);
    setCurrentPage(1); // Đưa về trang 1 (trigger fetch)
  };

  // Định nghĩa các cột của Bảng
  const columns: ColumnsType<AdminBillDetailResponse> = [
    {
      title: "Căn hộ",
      dataIndex: "apartmentCode",
      key: "apartmentCode",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Tháng",
      dataIndex: "billingMonth",
      key: "billingMonth",
    },
    {
      title: "Loại phí",
      dataIndex: "feeTypeName",
      key: "feeTypeName",
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      render: (value: number) => (
        <span style={{ color: "#cf1322", fontWeight: "bold" }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: "Hạn thanh toán",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (value: string) => formatDate(value),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "default";
        let text = status;
        if (status === "PAID") {
          color = "success";
          text = "Đã thanh toán";
        } else if (status === "UNPAID") {
          color = "error";
          text = "Chưa thanh toán";
        } else if (status === "PENDING") {
          color = "processing";
          text = "Chờ duyệt";
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  return (
    <Card
      className="admin-payment-wrapper"
      title={
        <h2 className="admin-payment-title" style={{ margin: 0 }}>
          Quản lý thanh toán
        </h2>
      }
      style={{ margin: "20px" }}
    >
      {/* THANH BỘ LỌC (TOOLBAR) */}
      <Space wrap className="admin-payment-toolbar">
        <Input
          className="admin-payment-control" /* Gắn class vào đây */
          placeholder="Mã căn hộ"
          value={filterApartmentCode}
          onChange={(e) => setFilterApartmentCode(e.target.value)}
          style={{ width: 180 }}
          allowClear
        />

        <Select
          className="admin-payment-control" /* Gắn class vào đây */
          placeholder="Tháng"
          value={filterMonth}
          onChange={(val) => setFilterMonth(val)}
          style={{ width: 130 }}
          allowClear
        >
          {[...Array(12)].map((_, i) => (
            <Option key={i + 1} value={i + 1}>
              Tháng {i + 1}
            </Option>
          ))}
        </Select>

        <InputNumber
          className="admin-payment-control" /* Gắn class vào đây */
          placeholder="Năm"
          value={filterYear}
          onChange={(val) => setFilterYear(val)}
          style={{ width: 130 }}
        />

        <Select
          className="admin-payment-control" /* Gắn class vào đây */
          placeholder="Trạng thái"
          value={filterStatus}
          onChange={(val) => setFilterStatus(val)}
          style={{ width: 160 }}
          allowClear
        >
          <Option value="PAID">Đã thanh toán</Option>
          <Option value="UNPAID">Chưa thanh toán</Option>
          <Option value="PENDING">Chờ duyệt</Option>
        </Select>

        <Button
          type="primary"
          className="admin-payment-control"
          onClick={handleFilter}
        >
          Lọc
        </Button>
        <Button className="admin-payment-control" onClick={handleClearFilter}>
          Xóa lọc
        </Button>
      </Space>

      {/* BẢNG DỮ LIỆU */}
      <Table
        columns={columns}
        dataSource={data}
        rowKey="detailId"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalElements,
          showSizeChanger: false, // Tắt tính năng đổi số dòng/trang vì bạn fix cứng 5 dòng
          onChange: (page) => setCurrentPage(page),
        }}
      />
    </Card>
  );
};

export default AdminPaymentManagement;
