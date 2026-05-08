import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/api';
import '../../styles/user-bill.css';

interface BillDetailRow {
    detailId: number;
    billingMonth: string;
    feeTypeName: string;
    amount: number;
    status: 'PAID' | 'UNPAID' | 'PENDING';
    billId: number;
    createdAt: string;
}

const UserBill: React.FC = () => {
    const [details, setDetails] = useState<BillDetailRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get<BillDetailRow[]>('/bills/my-apartment/details')
            .then(res => setDetails(res.data))
            .finally(() => setLoading(false));
    }, []);

    // Thống kê dựa trên BillId duy nhất để tránh đếm trùng nếu 1 bill có nhiều phí
    const uniqueBills = Array.from(new Set(details.map(d => d.billId))).map(id => 
        details.find(d => d.billId === id)
    );
    const paidCount = uniqueBills.filter(b => b?.status === 'PAID').length;
    const unpaidCount = uniqueBills.filter(b => b?.status !== 'PAID').length;

    if (loading) return <div>Đang tải dữ liệu...</div>;

    return (
        <div className="user-bill-container">
            {/* 2 THẺ THỐNG KÊ CĂN GIỮA */}
            <div className="user-bill-stats-wrapper">
                <div className="user-bill-stat-card user-bill-card-paid">
                    <div className="user-bill-stat-title">Hóa đơn đã thanh toán</div>
                    <div className="user-bill-stat-value user-bill-value-paid">{paidCount}</div>
                </div>
                <div className="user-bill-stat-card user-bill-card-unpaid">
                    <div className="user-bill-stat-title">Hóa đơn chưa thanh toán</div>
                    <div className="user-bill-stat-value user-bill-value-unpaid">{unpaidCount}</div>
                </div>
            </div>

            {/* BẢNG DỮ LIỆU ĐỔ TỪ MOCK DATA */}
            <div className="user-bill-table-container">
                <table className="user-bill-table">
                    <thead>
                        <tr>
                            <th>Tháng</th>
                            <th>Loại phí</th>
                            <th>Số tiền (VNĐ)</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((item) => (
                            <tr key={item.detailId}>
                                <td>{item.billingMonth}</td>
                                <td><strong>{item.feeTypeName}</strong></td>
                                <td>{item.amount.toLocaleString()}</td>
                                <td>
                                    <span className={`user-bill-status-badge status-${item.status.toLowerCase()}`}>
                                        {item.status === 'PAID' ? 'Đã thanh toán' : 
                                         item.status === 'PENDING' ? 'Chờ duyệt' : 'Chưa thanh toán'}
                                    </span>
                                </td>
                                <td>
                                    {item.status === 'UNPAID' && (
                                        <button className="user-bill-btn-pay">Thanh toán</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserBill;