import { Modal, Card, Row, Col, Tag, Button, Empty, Spin } from "antd";
import { useEffect, useState } from "react";
import momoQr from "../../assets/momo-qr.png";
import "../../styles/user-payment.css";
import type { UserAggregatedBill, UserBillFull } from "../../types/residentDashboard";
import { getMyAggregatedBills, getMyBillDetail } from "../../utils/residentDashboard";
import {
  CheckCircleOutlined,
  WalletOutlined,
  WarningOutlined,
  HistoryOutlined,
  FileTextOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const Payment = () => {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<UserAggregatedBill[]>([]);
  const [currentBillDetail, setCurrentBillDetail] = useState<UserBillFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getMyAggregatedBills();
      const sortedBills = [...data].sort((a, b) => {
        const [mA, yA] = a.billingMonth.split('/').map(Number);
        const [mB, yB] = b.billingMonth.split('/').map(Number);
        return (yB * 100 + mB) - (yA * 100 + mA);
      });
      setBills(sortedBills);

      const unpaidBill = sortedBills.find(b => b.status !== "Đã thanh toán");
      const billToFetch = unpaidBill || sortedBills[0];

      if (billToFetch) {
        fetchDetail(billToFetch.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: number) => {
    setDetailLoading(true);
    const detail = await getMyBillDetail(id);
    setCurrentBillDetail(detail);
    setDetailLoading(false);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case "Đã thanh toán":
        return <Tag color="success" icon={<CheckCircleOutlined />}>Đã thanh toán</Tag>;
      case "Quá hạn":
        return <Tag color="error" icon={<WarningOutlined />}>Quá hạn</Tag>;
      default:
        return <Tag color="warning" icon={<WalletOutlined />}>Chưa thanh toán</Tag>;
    }
  };

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}><Spin size="large" tip="Đang tải dữ liệu..." /></div>;

  return (
    <div className="user-payment-page">
      <header className="ph-page-intro">
        <h1 className="ph-page-intro__title">THANH TOÁN HÓA ĐƠN</h1>
        <p className="ph-page-intro__sub">Xem các khoản phí và trạng thái thanh toán của căn hộ.</p>
      </header>

      <Row gutter={24}>
        <Col span={16}>
          <div className="section-title"><FileTextOutlined /> Nội dung hóa đơn</div>
          {detailLoading ? <Card loading /> : currentBillDetail ? (
            <div className="current-bill-section">
              <div className="bill-header">
                <div className="bill-title-area">
                  <h3>Hóa đơn tháng {currentBillDetail.billingMonth}</h3>
                  <div className="bill-meta">
                    <span>Căn hộ: <strong>{currentBillDetail.apartmentCode}</strong></span>
                    <span>Hạn thanh toán: <strong style={{ color: '#ef4444' }}>{dayjs(currentBillDetail.dueDate).format('DD/MM/YYYY')}</strong></span>
                  </div>
                </div>
                <div className="bill-status">
                  {getStatusTag(currentBillDetail.status)}
                </div>
              </div>

              <div className="bill-detail-list">
                {currentBillDetail.details.map((fee) => (
                  <div className="bill-item" key={fee.id}>
                    <div className="bill-item-info">
                      <span className="fee-name">{fee.feeName}</span>
                      {fee.note && <small className="fee-calc" style={{ fontStyle: 'normal', color: '#64748b' }}>Ghi chú: {fee.note}</small>}
                    </div>
                    <div className="bill-item-amount">
                      {formatCurrency(fee.amount)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bill-footer">
                <div className="total-row">
                  <span className="total-label">TỔNG CỘNG</span>
                  <span className="total-value">{formatCurrency(currentBillDetail.totalAmount)}</span>
                </div>
                {currentBillDetail.status !== "Đã thanh toán" && (
                  <Button
                    type="primary"
                    danger
                    size="large"
                    className="btn-pay-now"
                    onClick={() => setIsModalOpen(true)}
                  >
                    THANH TOÁN NGAY
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Bạn hiện không có hóa đơn nào cần xử lý."
              />
            </div>
          )}
        </Col>

        <Col span={8}>
          <div className="section-title"><HistoryOutlined /> Lịch sử thanh toán</div>
          <div className="history-list">
            {bills.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : bills.map(bill => (
              <div
                key={bill.id}
                className={`history-card-item ${currentBillDetail?.id === bill.id ? 'active' : ''}`}
                onClick={() => fetchDetail(bill.id)}
                style={currentBillDetail?.id === bill.id ? { borderColor: '#3b82f6', background: '#f8fafc' } : {}}
              >
                <div className="history-info">
                  <span className="history-month">Kỳ {bill.billingMonth}</span>
                  <span className="history-date">Hạn: {dayjs(bill.dueDate).format('DD/MM/YYYY')}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="history-amount">{formatCurrency(bill.totalAmount)}</div>
                  <div style={{ marginTop: 4 }}>{getStatusTag(bill.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </Col>
      </Row>

      <Modal
        title="Thông tin thanh toán"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        width={400}
      >
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <img
            src={momoQr}
            alt="Mã QR MoMo"
            style={{
              width: "250px",
              height: "250px",
              objectFit: "contain",
              marginBottom: "20px",
              border: "1px solid #f0f0f0",
              borderRadius: "8px",
              padding: "10px",
            }}
          />
          <div style={{ fontSize: "16px", marginBottom: "8px", color: "#333", fontWeight: 600 }}>
            Số tiền cần thanh toán:
          </div>
          <div
            style={{ fontSize: "32px", fontWeight: "900", color: "#cf1322" }}
          >
            {formatCurrency(currentBillDetail?.totalAmount || 0)}
          </div>
          <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569', textAlign: 'left' }}>
            <p style={{ marginBottom: 8 }}><strong>Nội dung chuyển khoản:</strong></p>
            <code style={{ display: 'block', padding: 8, background: '#e2e8f0', color: '#1e293b', fontWeight: 700, borderRadius: 4, textAlign: 'center' }}>
              TT {currentBillDetail?.apartmentCode} THANG {currentBillDetail?.billingMonth?.replace('/', '')}
            </code>
            <p style={{ marginTop: 12, fontSize: 12 }}>
              * Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống tự động gạch nợ.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payment;
