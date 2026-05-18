import {
  Button,
  DatePicker,
  Form,
  InputNumber,
  Modal,
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

interface Apartment {
  id: number;
  code: string;
}

interface FeeType {
  id: number;
  code: string;
  name: string;
  defaultAmount: number;
  isMetered: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value || 0);
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
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Filter states
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  // States cho Modal Tạo Hóa Đơn
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // State phục vụ tính toán realtime
  const [previewAmount, setPreviewAmount] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const selectedFeeTypeId = Form.useWatch("feeTypeId", form);
  const selectedFeeType = feeTypes.find((f) => f.id === selectedFeeTypeId);

  const columns: ColumnsType<AdminBillDetailResponse> = [
    {
      title: "Mã Căn Hộ",
      dataIndex: "apartmentCode",
      key: "apartmentCode",
    },
    {
      title: "Tháng",
      dataIndex: "billingMonth",
      key: "billingMonth",
    },
    {
      title: "Loại Phí",
      dataIndex: "feeTypeName",
      key: "feeTypeName",
    },
    {
      title: "Số Tiền",
      dataIndex: "amount",
      key: "amount",
      render: (val) => <span style={{ color: "red", fontWeight: 500 }}>{formatCurrency(val)}</span>,
    },
    {
      title: "Hạn Đóng",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (val) => formatDate(val),
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "default";
        let text = status;
        if (status === "PAID") {
          color = "green";
          text = "Đã thanh toán";
        } else if (status === "UNPAID") {
          color = "red";
          text = "Chưa thanh toán";
        } else if (status === "PENDING") {
          color = "orange";
          text = "Chờ duyệt";
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage - 1,
        size: pageSize,
      };
      if (filterMonth && filterYear) {
        params.billingMonth = `${filterMonth.toString().padStart(2, "0")}/${filterYear}`;
      }
      if (filterStatus) params.status = filterStatus;

      const res = await axiosInstance.get("/bills/admin/details", { params });
      setData(res.data.content || []);
      setTotalElements(res.data.totalElements || 0);
    } catch (error) {
      message.error("Lỗi khi tải danh sách hóa đơn!");
    } finally {
      setLoading(false);
    }
  };

  const fetchModalData = async () => {
    try {
      const aptRes = await axiosInstance.get("/apartments"); 
      setApartments(aptRes.data || []);

      const feeRes = await axiosInstance.get("/fee-types");
      setFeeTypes(feeRes.data || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu metadata", error);
      message.error("Không tải được danh sách căn hộ hoặc loại phí!");
    }
  };

  useEffect(() => {
    fetchBills();
  }, [currentPage]);

  useEffect(() => {
    fetchModalData();
  }, []);

  const handleFilter = () => {
    setCurrentPage(1);
    fetchBills();
  };

  const handleClearFilter = () => {
    setFilterMonth(null);
    setFilterYear(null);
    setFilterStatus(undefined);
    setCurrentPage(1);
    // Có thể set timeout nhẹ để đảm bảo state ăn trước khi gọi API
    setTimeout(() => fetchBills(), 0); 
  };

  const showCreateModal = () => {
    setIsModalVisible(true);
    form.resetFields();
    setPreviewAmount(null);
    setPreviewError(null);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // Tự động set defaultAmount nếu chọn phí không có chỉ số
  useEffect(() => {
    if (selectedFeeType && !selectedFeeType.isMetered) {
      form.setFieldsValue({ amount: selectedFeeType.defaultAmount });
      setPreviewAmount(null);
      setPreviewError(null);
    }
  }, [selectedFeeTypeId, selectedFeeType, form]);

  // Handle preview realtime
  const handleMeterReadingChange = async (newReading: number | null) => {
    const apartmentId = form.getFieldValue("apartmentId");
    const billingMonth = form.getFieldValue("billingMonth");
    
    if (newReading !== null && newReading !== undefined && apartmentId && billingMonth && selectedFeeType?.isMetered) {
      try {
        setPreviewError(null);
        const formattedMonth = billingMonth.format("MM/YYYY");
        const mappedMeterTypeId = selectedFeeType.code === 'ELECTRIC' ? 2 : (selectedFeeType.code === 'WATER' ? 1 : selectedFeeType.id);
        // Gọi API preview vừa viết ở Backend
        const res = await axiosInstance.post("/admin/meter-readings/preview", {
          apartmentId: apartmentId,
          meterTypeId: mappedMeterTypeId, // Giả định id fee map logic vs meter type ở back
          billingMonth: formattedMonth,
          newReading: newReading,
        });
        
        setPreviewAmount(res.data);
      } catch (error: any) {
        setPreviewAmount(null);
        setPreviewError(error.response?.data || "Chỉ số mới không hợp lệ so với tháng trước.");
      }
    } else {
      setPreviewAmount(null);
      setPreviewError(null);
    }
  };

  const handleCreateBill = async (values: any) => {
    setSubmitting(true);
    try {
      const formattedMonth = values.billingMonth.format("MM/YYYY");
      
      if (selectedFeeType?.isMetered) {
        if (previewError) {
          message.error(previewError);
          setSubmitting(false);
          return;
        }
        const mappedMeterTypeId = selectedFeeType.code === 'ELECTRIC' ? 2 : (selectedFeeType.code === 'WATER' ? 1 : selectedFeeType.id);
        await axiosInstance.post("/admin/meter-readings/record", {
          apartmentId: values.apartmentId,
          meterTypeId: mappedMeterTypeId,
          billingMonth: formattedMonth,
          newReading: values.newReading,
        });
        message.success("Đã ghi nhận chỉ số và tạo hóa đơn thành công!");
      } else {
        await axiosInstance.post("/bills/admin/create-fixed-fee", {
          apartmentId: values.apartmentId,
          feeTypeId: values.feeTypeId,
          billingMonth: formattedMonth,
          amount: values.amount,
        });
        message.success("Đã tạo hóa đơn phí cố định thành công!");
      }

      setIsModalVisible(false);
      handleFilter(); // Làm mới lại bảng
    } catch (error: any) {
      message.error(error.response?.data || "Lỗi khi tạo hóa đơn");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-payment-container admin-payment-wrapper">
      <h2 className="admin-payment-title">Quản Lý Hóa Đơn (Admin)</h2>

      <Space className="admin-payment-toolbar" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Space>
          <Select
            className="admin-payment-control"
            placeholder="Tháng"
            value={filterMonth}
            onChange={(val) => setFilterMonth(val)}
            style={{ width: 100 }}
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

          <Button type="primary" className="admin-payment-control" onClick={handleFilter}>
            Lọc
          </Button>
          <Button className="admin-payment-control" onClick={handleClearFilter}>
            Xóa lọc
          </Button>
        </Space>

        <Button type="primary" style={{ backgroundColor: '#52c41a', height: '34px' }} onClick={showCreateModal}>
          + Tạo Hóa Đơn
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

      <Modal
        title="Tạo Hóa Đơn Mới"
        open={isModalVisible} // open thay cho visible trong antd v5
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateBill}>
          <Form.Item
            name="apartmentId"
            label="Căn hộ áp dụng"
            rules={[{ required: true, message: "Vui lòng chọn căn hộ!" }]}
          >
            <Select 
                placeholder="Chọn căn hộ" 
                showSearch 
                optionFilterProp="children"
                onChange={() => {
                  // Re-trigger preview nếu đã nhập số nhưng đổi nhà
                  const rd = form.getFieldValue("newReading");
                  if (rd) handleMeterReadingChange(rd);
                }}
            >
              {apartments.map((apt) => (
                <Option key={apt.id} value={apt.id}>
                  {apt.code}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="billingMonth"
            label="Kỳ hóa đơn (Tháng/Năm)"
            rules={[{ required: true, message: "Vui lòng chọn kỳ hóa đơn!" }]}
          >
            <DatePicker 
                picker="month" 
                format="MM/YYYY" 
                style={{ width: '100%' }}
                onChange={() => {
                  const rd = form.getFieldValue("newReading");
                  if (rd) handleMeterReadingChange(rd);
                }} 
            />
          </Form.Item>

          <Form.Item
            name="feeTypeId"
            label="Loại Phí"
            rules={[{ required: true, message: "Vui lòng chọn loại phí!" }]}
          >
            <Select placeholder="Chọn loại phí">
              {feeTypes.map((fee) => (
                <Option key={fee.id} value={fee.id}>
                  {fee.name} {fee.isMetered ? "(Theo chỉ số)" : "(Cố định)"}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedFeeType && (
            <>
              {selectedFeeType.isMetered ? (
                <>
                  <Form.Item
                    name="newReading"
                    label="Nhập chỉ số đồng hồ (Mới)"
                    rules={[{ required: true, message: "Vui lòng nhập chỉ số!" }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      min={0} 
                      onBlur={(e) => handleMeterReadingChange(Number(e.target.value))}
                      placeholder="Nhập chỉ số tháng này (bấm ra ngoài để xem tính tiền)" 
                    />
                  </Form.Item>

                  {previewError && (
                    <div style={{ color: 'red', marginBottom: '20px' }}>
                      Lỗi: {previewError}
                    </div>
                  )}

                  {previewAmount !== null && !previewError && (
                    <div style={{ padding: '10px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '4px', marginBottom: '20px' }}>
                      <span style={{ fontWeight: 'bold' }}>Thành tiền (tạm tính): </span>
                      <span style={{ color: 'red', fontWeight: 'bold', fontSize: '18px' }}>{formatCurrency(previewAmount)}</span>
                    </div>
                  )}
                </>
              ) : (
                <Form.Item
                  name="amount"
                  label="Số tiền cần nộp (VNĐ)"
                  rules={[{ required: true, message: "Vui lòng nhập số tiền!" }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
              )}
            </>
          )}

          <Form.Item style={{ textAlign: 'right', marginTop: '20px', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleCancel}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Xác nhận
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPaymentManagement;