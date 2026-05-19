import {
  Button,
  DatePicker,
  Form,
  InputNumber,
  Modal,
  Select,
  Table,
  Tag,
  message,
  Descriptions,
  Card,
  Row,
  Col,
  Input,
  Alert
} from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import "../../styles/admin-payment.css";
import axiosInstance from "../../utils/api";
import dayjs from "dayjs";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WalletOutlined,
  EyeOutlined,
  PlusOutlined,
  CalendarOutlined,
  TeamOutlined,
  WarningOutlined
} from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

interface AdminAggregatedBillResponse {
  id: number;
  apartmentCode: string;
  ownerName: string;
  billingMonth: string;
  totalAmount: number;
  dueDate: string;
  status: string;
}

interface AdminBillDetailInfo {
  id: number;
  feeName: string;
  amount: number;
  note: string;
  oldReading: number | null;
  newReading: number | null;
  unitPrice: number;
  quantity: number;
}

interface AdminBillFullResponse {
  id: number;
  apartmentCode: string;
  ownerName: string;
  ownerPhone: string;
  billingMonth: string;
  createdAt: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  details: AdminBillDetailInfo[];
  paidAt: string | null;
  paymentMethod: string | null;
  transactionCode: string | null;
  confirmedBy: string | null;
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
  unitPrice: number;
  calculationType: 'FIXED' | 'ELECTRIC_METER';
  isMetered: boolean;
}

interface BillStatistics {
  totalCollected: number;
  totalUnpaid: number;
  overdueCount: number;
  unpaidCount: number;
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
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getPaymentMethodName = (method: string | null) => {
  if (!method) return "Không xác định";
  const upper = method.toUpperCase();
  if (upper === "CASH" || upper === "TIEN_MAT") return "Tiền mặt";
  if (upper === "BANK_TRANSFER" || upper === "TRANSFER" || upper === "CHUYEN_KHOAN") return "Chuyển khoản";
  return method;
};



const AdminPaymentManagement: React.FC = () => {
  const [data, setData] = useState<AdminAggregatedBillResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [stats, setStats] = useState<BillStatistics | null>(null);

  // Filter states
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterApt, setFilterApt] = useState<string>("");

  // Modal Tạo Hóa Đơn
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal Chi Tiết Hóa Đơn
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailData, setDetailData] = useState<AdminBillFullResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal Xác nhận thanh toán
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmForm] = Form.useForm();

  // Modal Sửa Khoản Phí
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminBillDetailInfo | null>(null);
  const [editForm] = Form.useForm();


  const [isInitModalVisible, setIsInitModalVisible] = useState(false);
  const [initForm] = Form.useForm();

  // Watchers for creating fee
  const selectedFeeTypeId = Form.useWatch("feeTypeId", form);
  const oldReading = Form.useWatch("oldReading", form);
  const newReading = Form.useWatch("newReading", form);

  useEffect(() => {
    if (selectedFeeTypeId) {
      const ft = feeTypes.find(f => f.id === selectedFeeTypeId);
      if (ft) {
        if (ft.calculationType === "FIXED") {
          form.setFieldsValue({
            amount: ft.defaultAmount,
            oldReading: undefined,
            newReading: undefined,
            unitPrice: undefined
          });
        } else if (ft.calculationType === "ELECTRIC_METER") {
          form.setFieldsValue({
            unitPrice: ft.unitPrice || 2167,
            amount: (newReading !== undefined && oldReading !== undefined && newReading >= oldReading)
              ? (newReading - oldReading) * (ft.unitPrice || 2167)
              : undefined
          });
        }
      }
    }
  }, [selectedFeeTypeId, feeTypes, form]);

  useEffect(() => {
    if (selectedFeeTypeId) {
      const ft = feeTypes.find(f => f.id === selectedFeeTypeId);
      if (ft?.calculationType === "ELECTRIC_METER") {
        if (oldReading !== undefined && newReading !== undefined && newReading >= oldReading) {
          const usage = newReading - oldReading;
          const up = form.getFieldValue("unitPrice") || 2167;
          form.setFieldsValue({ amount: usage * up });
        } else {
          form.setFieldsValue({ amount: undefined });
        }
      }
    }
  }, [oldReading, newReading, form, selectedFeeTypeId, feeTypes]);


  const handleInitializeMonth = async (values: any) => {
    const billingMonth = values.month.format("MM/YYYY");
    setSubmitting(true);
    try {
      await axiosInstance.post(`/admin/payments/initialize-month?billingMonth=${billingMonth}`);
      message.success(`Đã khởi tạo hóa đơn cố định cho toàn bộ căn hộ tháng ${billingMonth}`);
      setIsInitModalVisible(false);
      fetchBills();
      fetchStats();
    } catch (error) {
      message.error("Lỗi khi khởi tạo hóa đơn tháng!");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<AdminAggregatedBillResponse> = [
    {
      title: "Mã Căn Hộ",
      dataIndex: "apartmentCode",
      key: "apartmentCode",
      className: "premium-cell",
    },
    {
      title: "Chủ Hộ",
      dataIndex: "ownerName",
      key: "ownerName",
    },
    {
      title: "Tháng/Năm",
      dataIndex: "billingMonth",
      key: "billingMonth",
      render: (val) => <span className="month-tag">{val}</span>,
    },
    {
      title: "Tổng Tiền",
      dataIndex: "totalAmount",
      key: "amount",
      render: (val) => <span className="price-text">{formatCurrency(val)}</span>,
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
        let icon = null;
        if (status === "Đã thanh toán") {
          color = "green";
          icon = <CheckCircleOutlined />;
        } else if (status === "Chưa thanh toán") {
          color = "orange";
          icon = <ClockCircleOutlined />;
        } else if (status === "Quá hạn") {
          color = "red";
          icon = <ExclamationCircleOutlined />;
        }
        return <Tag color={color} icon={icon} className="premium-tag">{status}</Tag>;
      },
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          icon={<EyeOutlined />}
          style={{ height: '32px', display: 'inline-flex', alignItems: 'center' }}
          onClick={() => showDetailModal(record.id)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get("/admin/payments/statistics");
      setStats(res.data);
    } catch (error) {
      console.error("Lỗi tải thống kê");
    }
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage - 1,
        size: pageSize,
      };
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      if (filterStatus) params.status = filterStatus;
      if (filterApt) params.apartmentCode = filterApt;

      const res = await axiosInstance.get("/admin/payments", { params });
      setData(res.data.content || []);
      setTotalElements(res.data.totalElements || 0);
    } catch (error) {
      message.error("Lỗi khi tải danh sách hóa đơn!");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const aptRes = await axiosInstance.get("/apartments");
      setApartments(aptRes.data || []);

      const feeRes = await axiosInstance.get("/fee-types");
      setFeeTypes(feeRes.data || []);
    } catch (error) {
      message.error("Không tải được metadata!");
    }
  };

  useEffect(() => {
    fetchBills();
    fetchStats();
  }, [currentPage]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleFilter = () => {
    setCurrentPage(1);
    fetchBills();
  };

  const handleClearFilter = () => {
    setFilterMonth(null);
    setFilterYear(null);
    setFilterStatus(undefined);
    setFilterApt("");
    setCurrentPage(1);
    setTimeout(() => fetchBills(), 0);
  };

  const showDetailModal = async (id: number) => {
    setIsDetailModalVisible(true);
    setDetailLoading(true);
    try {
      const res = await axiosInstance.get(`/admin/payments/${id}`);
      setDetailData(res.data);
    } catch (error) {
      message.error("Lỗi tải chi tiết!");
      setIsDetailModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateBill = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        apartmentId: values.apartmentId,
        feeTypeId: values.feeTypeId,
        billingMonth: values.billingMonth.format("MM/YYYY"),
        amount: values.amount,
        note: values.note,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DDTHH:mm:ss') : null,
        oldReading: values.oldReading,
        newReading: values.newReading,
        unitPrice: values.unitPrice
      };
      await axiosInstance.post("/admin/payments", payload);
      message.success("Tạo hóa đơn thành công!");
      setIsModalVisible(false);
      fetchBills();
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data || "Lỗi khi tạo hóa đơn");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateElectricBill = () => {
    const electricFeeType = feeTypes.find(f => f.calculationType === 'ELECTRIC_METER');
    if (!electricFeeType) {
      message.error("Hệ thống chưa cấu hình loại phí điện!");
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      feeTypeId: electricFeeType.id,
      unitPrice: electricFeeType.unitPrice || 2167,
    });
    setIsModalVisible(true);
  };

  const handleConfirmPayment = async (values: any) => {
    setSubmitting(true);
    try {
      await axiosInstance.patch(`/admin/payments/${detailData?.id}/confirm`, {
        paymentDate: values.paymentDate ? values.paymentDate.format('YYYY-MM-DDTHH:mm:ss') : null,
        paymentMethod: values.paymentMethod,
        transactionCode: values.transactionCode,
        note: values.note
      });
      message.success("Xác nhận thanh toán thành công!");
      setIsConfirmModalVisible(false);
      showDetailModal(detailData!.id); 
      fetchBills();
      fetchStats();
    } catch (error: any) {
      message.error("Lỗi khi xác nhận");
    } finally {
      setSubmitting(false);
    }
  };

  const showEditModal = (detail: AdminBillDetailInfo) => {
    setEditingDetail(detail);
    setIsEditModalVisible(true);
    setTimeout(() => {
      const feeType = feeTypes.find(f => f.name === detail.feeName);
      editForm.setFieldsValue({
        feeTypeId: feeType?.id,
        amount: detail.amount,
        note: detail.note,
        dueDate: detailData?.dueDate ? dayjs(detailData.dueDate) : null
      });
    }, 0);
  };

  const handleUpdateDetail = async (values: any) => {
    if (!editingDetail || !detailData) return;
    setSubmitting(true);
    try {
      await axiosInstance.put(`/admin/payments/${detailData.id}`, {
        id: editingDetail.id,
        feeTypeId: values.feeTypeId,
        amount: values.amount,
        note: values.note,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DDTHH:mm:ss') : null,
        billingMonth: detailData.billingMonth
      });
      message.success("Cập nhật thành công!");
      setIsEditModalVisible(false);
      showDetailModal(detailData.id);
      fetchBills();
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data || "Lỗi khi cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="payment-admin-page">
      <div className="page-header">
        <h2 className="admin-payment-title">Quản Lý Thanh Toán & Hóa Đơn</h2>
        <div className="header-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateElectricBill}
            className="premium-btn"
            style={{ height: '44px' }}
          >
            Tạo tiền điện
          </Button>
          <Button
            type="default"
            icon={<CalendarOutlined />}
            onClick={() => setIsInitModalVisible(true)}
            className="premium-btn"
            style={{ height: '44px' }}
          >
            Khởi tạo tháng
          </Button>
        </div>
      </div>
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <StatCard
          title="Tổng đã thu"
          value={formatCurrency(stats?.totalCollected || 0)}
          icon={<CheckCircleOutlined style={{ color: '#22c55e' }} />}
        />
        <StatCard
          title="Tổng chưa thu"
          value={formatCurrency(stats?.totalUnpaid || 0)}
          icon={<WalletOutlined style={{ color: '#ef4444' }} />}
        />
        <StatCard
          title="Hộ chưa đóng"
          value={stats?.unpaidCount || 0}
          icon={<TeamOutlined style={{ color: '#f59e0b' }} />}
        />
        <StatCard
          title="Số căn quá hạn"
          value={stats?.overdueCount || 0}
          icon={<WarningOutlined style={{ color: '#dc2626' }} />}
        />
      </div>

      <Card className="filter-card">
        <div className="payment-filter-bar">
          <Input
            placeholder="Mã căn hộ"
            value={filterApt}
            onChange={e => setFilterApt(e.target.value)}
            style={{ width: 160 }}
            className="filter-control"
          />
          <Select
            placeholder="Tháng"
            value={filterMonth}
            onChange={(val) => setFilterMonth(val)}
            style={{ width: 100 }}
            allowClear
            className="filter-control"
          >
            {[...Array(12)].map((_, i) => (
              <Option key={`month-filter-${i + 1}`} value={i + 1}>Tháng {i + 1}</Option>
            ))}
          </Select>
          <InputNumber
            placeholder="Năm"
            value={filterYear}
            onChange={(val: any) => setFilterYear(val)}
            style={{ width: 100 }}
            className="filter-control"
          />
          <Select
            placeholder="Trạng thái"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            style={{ width: 160 }}
            allowClear
            className="filter-control"
          >
            <Option value="PAID">Đã thanh toán</Option>
            <Option value="UNPAID">Chưa thanh toán</Option>
          </Select>
          <Button type="primary" onClick={handleFilter} className="btn-filter">Lọc</Button>
          <Button onClick={handleClearFilter} className="btn-filter">Xóa lọc</Button>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        className="premium-table"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalElements,
          onChange: (page) => setCurrentPage(page),
        }}
      />

      <Modal
        title="Tạo Tiền Điện"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        wrapClassName="payment-admin-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateBill}>
          <Form.Item name="feeTypeId" hidden><Input /></Form.Item>
          <Form.Item name="apartmentId" label="Căn hộ" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {apartments.map(a => <Option key={a.id} value={a.id}>{a.code}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="billingMonth" label="Tháng/Năm" rules={[{ required: true }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="Hạn đóng">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Card style={{ backgroundColor: '#f8fafc', marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="oldReading" label="Chỉ số cũ" rules={[{ required: true, message: 'Nhập số cũ' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="newReading" label="Chỉ số mới" dependencies={['oldReading']} rules={[
                  { required: true, message: 'Nhập số mới' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (value === undefined || value === null || getFieldValue('oldReading') === undefined) {
                        return Promise.resolve();
                      }
                      if (value >= getFieldValue('oldReading')) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Chỉ số mới phải >= chỉ số cũ'));
                    },
                  }),
                ]}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Sử dụng (kWh)">
                  <Input
                    disabled
                    value={((newReading || 0) >= (oldReading || 0)) ? (newReading || 0) - (oldReading || 0) : 0}
                    style={{ color: '#1e3a8a', fontWeight: 'bold' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="unitPrice" label="Đơn giá (VNĐ/kWh)">
                  <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item name="amount" label="Tổng số tiền (₫)" rules={[{ required: true }]}>
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              readOnly
              className="readonly-input-total"
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>Tạo Tiền Điện</Button>
        </Form>
      </Modal>



      <Modal
        title="Khởi tạo hóa đơn định kỳ"
        open={isInitModalVisible}
        onCancel={() => setIsInitModalVisible(false)}
        footer={null}
        destroyOnClose
        wrapClassName="payment-admin-modal"
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Thông tin"
            description="Hệ thống sẽ tự động tạo hóa đơn cho toàn bộ căn hộ với các khoản phí cố định (Tiền nước, Phí quản lý...) đã được cấu hình. Chức năng này chỉ tạo các khoản phí cố định, không tạo tiền điện."
            type="info"
            showIcon
          />
        </div>
        <Form form={initForm} layout="vertical" onFinish={handleInitializeMonth}>
          <Form.Item name="month" label="Chọn tháng/năm cần khởi tạo" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>Khởi tạo ngay</Button>
        </Form>
      </Modal>

      <Modal
        title="Chi tiết hóa đơn"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={800}
        wrapClassName="payment-admin-modal"
        footer={[
          detailData?.status !== "Đã thanh toán" && (
            <Button key="confirm" type="primary" danger onClick={() => setIsConfirmModalVisible(true)} style={{ height: '32px' }}>
              Xác Nhận Thanh Toán
            </Button>
          ),
          <Button key="close" onClick={() => setIsDetailModalVisible(false)} style={{ height: '32px' }}>Đóng</Button>
        ]}
      >
        {detailLoading ? <p>Đang tải...</p> : detailData && (
          <div className="premium-details">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Căn hộ">{detailData.apartmentCode}</Descriptions.Item>
              <Descriptions.Item label="Chủ hộ">{detailData.ownerName}</Descriptions.Item>
              <Descriptions.Item label="Kỳ thanh toán">{detailData.billingMonth}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={detailData.status === "Đã thanh toán" ? "green" : "red"}>{detailData.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Hạn đóng" span={2}>
                <span style={{ color: 'red', fontWeight: 'bold' }}>{formatDate(detailData.dueDate)}</span>
              </Descriptions.Item>
            </Descriptions>

            <h4 style={{ margin: '20px 0 10px' }}>Chi tiết các khoản phí:</h4>
            <Table
              dataSource={detailData.details}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Tên phí', dataIndex: 'feeName', key: 'feeName' },
                {
                  title: 'Chi tiết',
                  key: 'details',
                  render: (_, r) => r.oldReading !== null ? (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {r.oldReading} → {r.newReading} ({r.quantity} kWh) x {formatCurrency(r.unitPrice)}
                    </div>
                  ) : null
                },
                { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: v => <b style={{ color: '#1e293b' }}>{formatCurrency(v)}</b> },
                { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
                {
                  title: 'Thao tác',
                  key: 'action',
                  render: (_, record) => (
                    detailData.status !== "Đã thanh toán" && (
                      <Button type="link" onClick={() => showEditModal(record)} style={{ height: '32px', padding: 0 }}>
                        Sửa
                      </Button>
                    )
                  )
                }
              ]}
              summary={pageData => {
                let total = 0;
                pageData.forEach(p => total += p.amount);
                return (
                  <Table.Summary.Row style={{ background: '#f5f5f5' }}>
                    <Table.Summary.Cell index={0}><b>Tổng cộng</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={1}></Table.Summary.Cell>
                    <Table.Summary.Cell index={2}><b style={{ color: 'red' }}>{formatCurrency(total)}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={3}></Table.Summary.Cell>
                    <Table.Summary.Cell index={4}></Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />

            {detailData.status === "Đã thanh toán" && (
              <Card title="Thông tin giao dịch" size="small" style={{ marginTop: 20 }}>
                <Descriptions column={2}>
                  <Descriptions.Item label="Ngày trả">{formatDate(detailData.paidAt)}</Descriptions.Item>
                  <Descriptions.Item label="Phương thức">{getPaymentMethodName(detailData.paymentMethod)}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Xác Nhận Thanh Toán"
        open={isConfirmModalVisible}
        onCancel={() => setIsConfirmModalVisible(false)}
        footer={null}
        destroyOnClose
        wrapClassName="payment-admin-modal"
      >
        <Form form={confirmForm} layout="vertical" onFinish={handleConfirmPayment} initialValues={{ paymentMethod: 'CASH', paymentDate: null }}>
          <Form.Item name="paymentDate" label="Ngày thanh toán" initialValue={null}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Bỏ trống nếu là hôm nay" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Phương thức" rules={[{ required: true }]}>
            <Select>
              <Option value="CASH">Tiền mặt</Option>
              <Option value="TRANSFER">Chuyển khoản</Option>
            </Select>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>Xác Nhận</Button>
        </Form>
      </Modal>

      <Modal
        title={`Sửa khoản phí: ${editingDetail?.feeName}`}
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        destroyOnClose
        wrapClassName="payment-admin-modal"
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateDetail}>
          <Form.Item name="feeTypeId" label="Loại phí" rules={[{ required: true }]}>
            <Select disabled>
              {feeTypes.map(f => <Option key={f.id} value={f.id}>{f.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="Số tiền (₫)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="dueDate" label="Hạn đóng">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>Lưu thay đổi</Button>
        </Form>
      </Modal>
    </div >
  );
};

export default AdminPaymentManagement;