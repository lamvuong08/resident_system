import React, { useState } from 'react';
import '../../styles/dashboard.css';
import '../../styles/App.css';

type NotificationType = 'GENERAL' | 'PAYMENT' | 'MAINTENANCE' | 'EMERGENCY';
type RequestType = 'REPAIR' | 'COMPLAINT' | 'SUPPORT';

const ResidentSupport: React.FC = () => {
    const [requestType, setRequestType] = useState<RequestType>('SUPPORT');

    return (
        <div className="dashboard-root">
            <h1 className="section-title">Hỗ trợ & Thông báo</h1>
            
            <div className="dashboard-content">
                {/* CỘT TRÁI: DANH SÁCH THÔNG BÁO */}
                <div className="dashboard-main">
                    <div className="building-detail" style={{ display: 'block' }}>
                        <div className="detail-header">
                            <h2 style={{ color: '#1E3A8A' }}>Thông báo từ Ban quản lý</h2>
                        </div>
                        
                        <div className="apartment-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="apt-card apt-pending payment-alert" style={{ minHeight: 'auto', width: '100%' }}>
                                <div className="apt-top">
                                    <span className="apt-code" style={{ color: '#dc2626' }}>[THANH TOÁN]</span>
                                    <span className="small muted">20/04/2026</span>
                                </div>
                                <div className="apt-owner">Hóa đơn tháng 04/2026 của bạn sắp hết hạn. Vui lòng thanh toán trước ngày 25/04.</div>
                            </div>

                            <div className="apt-card apt-occupied maintenance-alert" style={{ minHeight: 'auto', width: '100%' }}>
                                <div className="apt-top">
                                    <span className="apt-code" style={{ color: '#1e6efc' }}>[BẢO TRÌ]</span>
                                    <span className="small muted">18/04/2026</span>
                                </div>
                                <div className="apt-owner">Tòa A1 sẽ bảo trì hệ thống thang máy từ 09:00 - 11:00 sáng mai.</div>
                            </div>

                            <div className="apt-card emergency" style={{ minHeight: 'auto', width: '100%' }}>
                                <div className="apt-top">
                                    <span className="apt-code" style={{ color: '#ef4444' }}>🚨 KHẨN CẤP</span>
                                    <span className="small muted">Vừa xong</span>
                                </div>
                                <div className="apt-owner"><b>Diễn tập PCCC:</b> Tất cả cư dân vui lòng tập trung tại sảnh tòa nhà lúc 15:00.</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: FORM GỬI YÊU CẦU */}
                <div className="dashboard-side" style={{ display: 'block' }}>
                    <div className="card" style={{ width: '100%', padding: '24px' }}>
                        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Gửi yêu cầu hỗ trợ</h2>
                        
                        <div className="form-row">
                            <label>Loại yêu cầu</label>
                            <select 
                                className="search-select" 
                                style={{ width: '100%', padding: '0 12px' }}
                                value={requestType}
                                onChange={(e) => setRequestType(e.target.value as RequestType)}
                            >
                                <option value="SUPPORT">Gia hạn thanh toán (Support)</option>
                                <option value="REPAIR">Sửa chữa thiết bị (Repair)</option>
                                <option value="COMPLAINT">Khiếu nại/Góp ý (Complaint)</option>
                            </select>
                        </div>

                        {requestType === 'SUPPORT' && (
                            <div className="otp-note" style={{ color: '#16a34a', marginBottom: '12px' }}>
                                * Bạn đang tạo yêu cầu xin gia hạn cho hóa đơn chưa thanh toán.
                            </div>
                        )}

                        <div className="form-row">
                            <label>Nội dung chi tiết</label>
                            <textarea 
                                className="search-input custom-textarea" 
                                placeholder="Nhập lý do hoặc mô tả sự cố..."
                            ></textarea>
                        </div>

                        <button className="btn" style={{ marginTop: '10px' }}>
                            Gửi yêu cầu ngay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResidentSupport;