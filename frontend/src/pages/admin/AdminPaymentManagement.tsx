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
  Card,
  Row,
  Col,
  Input,
  Alert
} from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useEffect, useRef, useState } from "react";
import StatCard from "../../components/StatCard";
import InvoiceDetailContent from "../../components/InvoiceDetailContent";
import MeterReadingDetailModal from "../../components/MeterReadingDetailModal";
import type { ReadingDetail } from "../../components/MeterReadingDetailModal";
import "../../styles/admin-payment.css";
import axiosInstance, { extractApiError } from "../../utils/api";
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

export interface AdminBillDetailInfo {
  feeCode: string;
  id: number;
  feeName: string;
  amount: number;
  note: string;
  oldReading: number | null;
  newReading: number | null;
  unitPrice: number;
  quantity: number;
}

export interface AdminBillFullResponse {
  issuanceStatus: 'DRAFT' | 'ISSUED';
  issuedAt: string | null;
  issuedBy: string | null;
  version: number;
  publicationBlockers: string[];
  paidAmount: number;
  outstanding: number;
  meterReadings: { readingId: number; detailId: number; oldReading: number | null; newReading: number | null; usageAmount: number | null; amount: number | null; feeCode: string; tariffSnapshot: string; recordedBy: string; recordedAt: string; approvedBy: string; approvedAt: string }[];
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

interface Props { billingMonth?: string; initialBillId?: number; onChanged?: () => void }
const AdminPaymentManagement: React.FC<Props> = ({ billingMonth, initialBillId, onChanged }) => {
  const [sourceReading, setSourceReading] = useState<ReadingDetail | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueDue, setIssueDue] = useState(dayjs().add(15, 'day'));
  const requestSequence = useRef(0);
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

  const handleInitializeMonth = async (values: any) => {
    const billingMonth = values.month.format("MM/YYYY");
    setSubmitting(true);
    try {
      await axiosInstance.post(`/admin/payments/initialize-month?billingMonth=${billingMonth}`);
      message.success(`Đã khởi tạo hóa đơn cố định cho toàn bộ căn hộ tháng ${billingMonth}`);
      setIsInitModalVisible(false); onChanged?.();
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
    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const params: any = {
        page: currentPage - 1,
        size: pageSize,
      };
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      if (billingMonth) { const [month, year] = billingMonth.split('/').map(Number); params.month = month; params.year = year; }
      if (filterStatus) params.status = filterStatus;
      if (filterApt) params.apartmentCode = filterApt;

      const res = await axiosInstance.get("/admin/payments", { params });
      if (sequence === requestSequence.current) { setData(res.data.content || []); setTotalElements(res.data.totalElements || 0); }
    } catch (error) {
      message.error("Lỗi khi tải danh sách hóa đơn!");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
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
  }, [currentPage, billingMonth, filterMonth, filterYear, filterStatus, filterApt]);

  useEffect(() => { if (initialBillId) void showDetailModal(initialBillId); }, [initialBillId]);

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

  };

  const issueInvoice = async () => {
    if (!detailData) return;
    setSubmitting(true);
    try {
      const response = await axiosInstance.post(`/admin/payments/${detailData.id}/issue`, { dueDate: issueDue.format('YYYY-MM-DD'), version: detailData.version });
      setDetailData(response.data); setIssueOpen(false); void fetchBills(); onChanged?.();
      message.success('Đã phát hành toàn bộ hóa đơn');
    } catch (error) { message.error(extractApiError(error, 'Không thể phát hành hóa đơn')); }
    finally { setSubmitting(false); }
  };

  const showDetailModal = async (id: number) => {
    setIsDetailModalVisible(true);
    setDetailData(null);
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
      };
      await axiosInstance.post("/admin/payments", payload);
      message.success("Tạo hóa đơn thành công!");
      setIsModalVisible(false); onChanged?.();
      fetchBills();
      fetchStats();
    } catch (error: any) {
      message.error(extractApiError(error, "Lỗi khi tạo hóa đơn"));
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateFeeBill = () => {
    form.resetFields();
    if (billingMonth) form.setFieldsValue({billingMonth: dayjs(billingMonth.split('/').reverse().join('-') + '-01')});
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
      setIsConfirmModalVisible(false); onChanged?.();
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
      setIsEditModalVisible(false); onChanged?.();
      showDetailModal(detailData.id);
      fetchBills();
      fetchStats();
    } catch (error: any) {
      message.error(extractApiError(error, "Lỗi khi cập nhật"));
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
            onClick={openCreateFeeBill}
            className="premium-btn"
            style={{ height: '44px' }}
          >
            Tạo khoản phí khác
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
      <div className="stats-row" style={{ marginBottom: 24, display: billingMonth ? 'none' : undefined }}>
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
          {!billingMonth && <>
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
          </>}
          <Select
            placeholder="Trạng thái"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            style={{ width: 160 }}
            allowClear
            className="filter-control"
          >
            <Option value="PAID">Đã thanh toán</Option>
            <Option value="DRAFT">Nháp</Option>
            <Option value="ISSUED">Đã phát hành</Option>
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

      <Modal title="Tạo khoản phí khác" open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} destroyOnClose wrapClassName="payment-admin-modal">
        <Alert type="info" showIcon message="Khoản phí được lưu vào hóa đơn nháp. Điện, nước tự cập nhật khi duyệt chỉ số; phát hành toàn bộ trong chi tiết hóa đơn." style={{ marginBottom: 16 }} />
        <Form form={form} layout="vertical" onFinish={handleCreateBill}>
          <Form.Item name="feeTypeId" label="Loại phí" rules={[{ required: true }]}>
            <Select onChange={id => { const fee = feeTypes.find(item => item.id === id); form.setFieldsValue({ amount: fee?.defaultAmount }); }}>
              {feeTypes.filter(fee => !['ELECTRIC', 'WATER'].includes(fee.code)).map(fee => <Option key={fee.id} value={fee.id}>{fee.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="apartmentId" label="Căn hộ" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">{apartments.map(apartment => <Option key={apartment.id} value={apartment.id}>{apartment.code}</Option>)}</Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="billingMonth" label="Tháng/Năm" rules={[{ required: true }]}><DatePicker picker="month" format="MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="dueDate" label="Hạn đóng" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="amount" label="Số tiền (₫)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>Tạo khoản phí</Button>
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
            description="Tổng hợp phí đã cấu hình vào hóa đơn nháp; phí xe chỉ áp dụng khi có xe đang hoạt động. Chưa gửi thông báo hay yêu cầu thanh toán."
            type="info"
            showIcon
          />
        </div>
        <Form form={initForm} layout="vertical" onFinish={handleInitializeMonth}>
          <Form.Item name="month" label="Chọn tháng/năm cần khởi tạo" rules={[{ required: true }]}>
            <DatePicker picker="month" format="MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>Khởi tạo ngay</Button>
        </Form>
      </Modal>

      <Modal
        title={<div className="detail-heading"><div><span className="detail-title">Chi tiết hóa đơn{detailData ? ` #${detailData.id}` : ''}</span>{detailData && <p>Căn hộ {detailData.apartmentCode} · Kỳ {detailData.billingMonth}</p>}</div>{detailData && <Tag color={detailData.issuanceStatus === 'DRAFT' ? 'default' : 'blue'}>{detailData.issuanceStatus === 'DRAFT' ? 'Bản nháp' : 'Đã phát hành'}</Tag>}</div>}
        open={isDetailModalVisible}
        onCancel={() => {setSourceReading(null);setIsDetailModalVisible(false);}}
        keyboard={!sourceReading}
        maskClosable={!sourceReading}
        width={920}
        wrapClassName="billing-detail-modal invoice-detail-modal"
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>Đóng</Button>,
          detailData?.issuanceStatus === 'ISSUED' && detailData?.status !== "Đã thanh toán" && (
            <Button key="confirm" type="primary" onClick={() => setIsConfirmModalVisible(true)}>Xác Nhận Thanh Toán</Button>
          ),
          detailData?.issuanceStatus === 'DRAFT' && <Button key="issue" type="primary" disabled={detailLoading || !!detailData.publicationBlockers?.length} onClick={() => setIssueOpen(true)}>Phát hành hóa đơn</Button>,
        ]}
      >
        {detailLoading ? <p role="status">Đang tải hóa đơn...</p> : detailData && <InvoiceDetailContent bill={detailData} onEdit={showEditModal} onViewReading={setSourceReading} />}
      </Modal>
      <MeterReadingDetailModal reading={sourceReading} onClose={() => setSourceReading(null)} />

      <Modal title="Xác nhận phát hành toàn bộ hóa đơn" open={issueOpen} onCancel={() => { if (!submitting) setIssueOpen(false); }} onOk={() => void issueInvoice()} confirmLoading={submitting} okText="Phát hành và thông báo" cancelText="Quay lại">
        <p>Căn hộ {detailData?.apartmentCode} · {detailData?.billingMonth} · {formatCurrency(detailData?.totalAmount || 0)}. Sau khi phát hành, các khoản phí sẽ được khóa.</p>
        <DatePicker aria-label="Hạn thanh toán hóa đơn" allowClear={false} value={issueDue} onChange={value => { if(value) setIssueDue(value); }} disabledDate={value => value.isBefore(dayjs(), 'day')} format="DD/MM/YYYY" />
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
              <Option value="BANK_TRANSFER">Chuyển khoản</Option>
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
              {feeTypes.filter(f => f.code !== 'ELECTRIC').map(f => <Option key={f.id} value={f.id}>{f.name}</Option>)}
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
