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
  const [data, setData] = useState<AdminBillDetailResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; 

  const [filterApartmentCode, setFilterApartmentCode] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchBills = async (page: number) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: page - 1, 
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

  useEffect(() => {
    fetchBills(currentPage);
  }, [currentPage]);

  const handleToggleStatus = async (record: AdminBillDetailResponse) => {
    const newStatus = record.status === "PAID" ? "UNPAID" : "PAID";
    const actionText =
      newStatus === "PAID"
        ? "xác nhận đã thanh toán"
        : "hủy xác nhận thanh toán";

    try {
      await axiosInstance.put(
        `/bills/admin/details/${record.detailId}/status`,
        null,
        {
          params: { status: newStatus },
        },
      );
      message.success(`Đã ${actionText} cho căn hộ ${record.apartmentCode}`);
      fetchBills(currentPage);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      message.error("Không thể cập nhật trạng thái hóa đơn.");
    }
  };

  const handleFilter = () => {
    if (currentPage === 1) {
      fetchBills(1);
    } else {
      setCurrentPage(1); 
    }
  };

  const handleClearFilter = () => {
    setFilterApartmentCode("");
    setFilterMonth(null);
    setFilterYear(null);
    setFilterStatus(null);
    setCurrentPage(1); 
  };

  const columns: ColumnsType<AdminBillDetailResponse> = [
    {
      title: "Căn hộ",
      dataIndex: "apartmentCode",
      key: "apartmentCode",
      align: "center",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Tháng",
      dataIndex: "billingMonth",
      key: "billingMonth",
      align: "center",
    },
    {
      title: "Loại phí",
      dataIndex: "feeTypeName",
      key: "feeTypeName",
      align: "center",
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      align: "center",
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
      align: "center",
      render: (value: string) => formatDate(value),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center",
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
    {
      title: "Hành động",
      key: "action",
      align: "center", 
      render: (_, record) => {
        const isPaid = record.status === 'PAID';
        
        return (
          <Button 
            className="admin-payment-control"
            type="default" 
            danger={isPaid}
            style={
              !isPaid 
                ? { color: '#52c41a', borderColor: '#52c41a', background: 'transparent' }
                : { background: 'transparent' }
            }
            onClick={() => handleToggleStatus(record)}
          >
            {isPaid ? 'Hủy xác nhận' : 'Xác nhận đã trả'}
          </Button>
        );
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
      <Space wrap className="admin-payment-toolbar">
        <Input
          className="admin-payment-control" 
          placeholder="Mã căn hộ"
          value={filterApartmentCode}
          onChange={(e) => setFilterApartmentCode(e.target.value)}
          style={{ width: 180 }}
          allowClear
        />

        <Select
          className="admin-payment-control" 
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
          className="admin-payment-control" 
          placeholder="Năm"
          value={filterYear}
          onChange={(val) => setFilterYear(val)}
          style={{ width: 130 }}
        />

        <Select
          className="admin-payment-control"
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

      <Table
        columns={columns}
        dataSource={data}
        rowKey="detailId"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalElements,
          showSizeChanger: false, 
          onChange: (page) => setCurrentPage(page),
        }}
      />
    </Card>
  );
};

export default AdminPaymentManagement;
