import { Alert, Modal } from "antd"; // THÊM IMPORT Modal TỪ ANTD
import { useEffect, useState } from "react";
import momoQr from "../../assets/momo-qr.png";
import PaymentSummaryCard from "../../components/resident/PaymentSummaryCard";
import "../../styles/resident-dashboard.css";
import type { DashboardPayment } from "../../types/residentDashboard";
import { getResidentPayments } from "../../utils/residentDashboard";

const PAYMENT_UNPAID_STATUSES = new Set([
  "UNPAID",
  "PENDING",
  "DUE",
  "UNPAID_INVOICE",
]);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const Payment = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<DashboardPayment[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getResidentPayments();
        if (mounted) {
          setPayments(data);
        }
      } catch {
        if (mounted) {
          setError("Không thể tải danh sách thanh toán.");
          setPayments([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const totalUnpaidAmount = payments
    .filter((item) => PAYMENT_UNPAID_STATUSES.has(item.status))
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="resident-page">
      <h2>Thanh toán</h2>
      {error && <Alert type="warning" showIcon message={error} />}

      <PaymentSummaryCard
        loading={loading}
        items={payments}
        totalUnpaidAmount={totalUnpaidAmount}
        // KÍCH HOẠT MỞ MODAL KHI CLICK
        onPayNow={() => setIsModalOpen(true)}
        showAll={true}
      />

      <Modal
        title="Thanh toán qua ví MoMo"
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
          <div style={{ fontSize: "16px", marginBottom: "8px", color: "#333" }}>
            Số tiền cần thanh toán:
          </div>
          <div
            style={{ fontSize: "28px", fontWeight: "bold", color: "#cf1322" }}
          >
            {formatCurrency(totalUnpaidAmount)}
          </div>
          <p style={{ marginTop: "20px", color: "#666", fontSize: "14px" }}>
            Vui lòng mở ứng dụng MoMo, quét mã QR trên và nhập chính xác số tiền
            hiển thị để thanh toán.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Payment;
