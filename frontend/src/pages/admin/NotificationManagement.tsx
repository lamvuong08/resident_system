import { Button, Card, Col, Form, Input, message, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

const { Title } = Typography;
const { TextArea } = Input;

interface Notification {
  id: number;
  title: string;
  content: string;
  type: 'GENERAL' | 'PAYMENT' | 'MAINTENANCE' | 'EMERGENCY';
  createdAt: string;
  createdBy?: string;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'GENERAL': return 'blue';
    case 'PAYMENT': return 'green';
    case 'MAINTENANCE': return 'gold';
    case 'EMERGENCY': return 'red';
    default: return 'default';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'GENERAL': return 'Chung';
    case 'PAYMENT': return 'Thanh toán';
    case 'MAINTENANCE': return 'Bảo trì';
    case 'EMERGENCY': return 'Khẩn cấp';
    default: return type;
  }
};

const NotificationManagement: React.FC = () => {
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingNoti, setEditingNoti] = useState<Notification | null>(null);
  const [detailForm] = Form.useForm();

  const detailFormValues = Form.useWatch([], detailForm);
  const isDirty = useMemo(() => {
    if (!editingNoti || !detailFormValues) return false;
    return (
      detailFormValues.title !== editingNoti.title ||
      detailFormValues.content !== editingNoti.content ||
      detailFormValues.type !== editingNoti.type
    );
  }, [detailFormValues, editingNoti]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  
  const targetTypeWatch = Form.useWatch('targetType', createForm);
  const selectedBuildingWatch = Form.useWatch('selectedBuildingId', createForm);

  const [buildingList, setBuildingList] = useState<any[]>([]);
  const [apartmentList, setApartmentList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedAptIds, setSelectedAptIds] = useState<number[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  const toggleApartment = (aptId: number) => {
    setSelectedAptIds(prev => 
      prev.includes(aptId) ? prev.filter(id => id !== aptId) : [...prev, aptId]
    );
  };

  const loadData = async (page = pagination.current, type = selectedType) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/notifications`, {
        params: { page: page - 1, size: pagination.pageSize, type: type || undefined }
      });
      setData(res.data.content || []);
      setPagination(prev => ({ ...prev, current: page, total: res.data.totalElements || 0 }));
    } catch (error) {
      message.error('Lỗi khi tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    try {
      const res = await api.get('/dashboard/buildings');
      setBuildingList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      message.error('Không tải được danh sách tòa nhà');
    }
  };

  // HÀM LẤY CĂN HỘ CHỐNG ĐẠN (BULLETPROOF)
  const loadApartments = async (buildingId: string) => {
    try {
      // 1. Thử gọi API chuẩn
      const res = await api.get('/api/apartments', { params: { buildingId, size: 1000 } });
      let list = [];
      
      if (res.data?.content) list = res.data.content; 
      else if (Array.isArray(res.data)) list = res.data;
      else if (res.data?.apartments) list = res.data.apartments;

      // 2. Nếu không có gì, gọi thử API Dashboard dự phòng
      if (list.length === 0) {
        const fallbackRes = await api.get(`/dashboard/buildings/${buildingId}`);
        if (fallbackRes.data?.apartments) list = fallbackRes.data.apartments;
        else if (Array.isArray(fallbackRes.data)) list = fallbackRes.data;
      }
      
      setApartmentList(list);
    } catch (error) {
      console.error("API Error Fetching Apartments:", error);
      message.error('Lỗi API khi tải danh sách căn hộ');
      setApartmentList([]); 
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (isCreateModalOpen && buildingList.length === 0) loadBuildings();
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (selectedBuildingWatch) {
      loadApartments(selectedBuildingWatch);
    }
  }, [selectedBuildingWatch]);

  const handleOpenCreate = () => {
    createForm.resetFields();
    setSelectedFloor(null);
    setSelectedAptIds([]);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      setIsSubmitting(true);

      let finalTargetType = 'ALL';
      let targetIds: number[] = [];
      let floorNumber = null;

      if (values.targetType === 'SPECIFIC') {
        if (selectedAptIds.length > 0) {
          finalTargetType = 'APARTMENT';
          targetIds = selectedAptIds;
        } else if (selectedFloor) {
          finalTargetType = 'FLOOR';
          targetIds = [values.selectedBuildingId];
          floorNumber = selectedFloor;
        } else {
          finalTargetType = 'BUILDING';
          targetIds = [values.selectedBuildingId];
        }
      }

      await api.post('/api/notifications', {
        title: values.title,
        content: values.content,
        type: values.type,
        targetType: finalTargetType,
        targetIds,
        floorNumber
      });

      message.success('Gửi thông báo thành công');
      setIsCreateModalOpen(false);
      loadData(1); 
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('Lỗi khi gửi thông báo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetails = (noti: Notification) => {
    setEditingNoti(noti);
    detailForm.setFieldsValue({ title: noti.title, content: noti.content, type: noti.type });
    setIsDetailModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingNoti) return;
    try {
      const values = await detailForm.validateFields();
      await api.put(`/api/notifications/${editingNoti.id}`, values);
      message.success('Cập nhật thông báo thành công');
      setIsDetailModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Không thể cập nhật thông báo');
    }
  };

  const handleDelete = async () => {
    if (!editingNoti) return;
    try {
      await api.delete(`/api/notifications/${editingNoti.id}`);
      message.success('Đã xóa thông báo');
      setIsDetailModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Xóa thông báo thất bại');
    }
  };

  const columns = [
    { title: 'Thông báo', dataIndex: 'title', key: 'title' },
    {
      title: 'Phân loại', dataIndex: 'type', key: 'type', width: 150,
      render: (type: string) => <Tag color={getTypeColor(type)}>{getTypeLabel(type)}</Tag>
    },
    {
      title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString('vi-VN') : '-'
    },
    {
      key: 'action', width: 120,
      render: (_: any, record: Notification) => (
        <Button type="link" onClick={() => handleOpenDetails(record)}>Chi tiết</Button>
      )
    }
  ];

  // LOGIC LỌC TẦNG CHỐNG LỖI DB
  // LOGIC LỌC TẦNG CHỐNG LỖI DB BẰNG REGEX (BULLETPROOF)
  const filteredApartments = useMemo(() => {
    if (!selectedFloor || apartmentList.length === 0) return [];
    
    return apartmentList.filter(a => {
      // 1. Quét mọi tên biến có thể có từ Spring Boot
      const fProp = Number(a.floorNumber || a.floor_number || a.floor || -1);
      
      // 2. Dùng Regex moi số tầng từ chuỗi mã căn hộ (Chấp mọi format)
      let fCode = -1;
      const codeStr = String(a.code || a.apartmentCode || a.name || '');
      // Bắt 1-2 chữ số đứng ngay trước 2 chữ số cuối. VD: "0301" -> bắt "03" -> tầng 3. "1008" -> bắt "10" -> tầng 10.
      const match = codeStr.match(/(\d{1,2})\d{2}$/); 
      if (match && match[1]) {
        fCode = Number(match[1]);
      }

      return fProp === Number(selectedFloor) || fCode === Number(selectedFloor);
    });
  }, [apartmentList, selectedFloor]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Quản lý thông báo</Title>
        <Button type="primary" style={{ background: 'var(--accent)' }} onClick={handleOpenCreate}>+ Thêm mới</Button>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Space style={{ marginBottom: 16 }}>
          {['Tất cả', 'GENERAL', 'PAYMENT', 'MAINTENANCE', 'EMERGENCY'].map((t) => (
            <Button 
              key={t}
              type={(selectedType === t || (t === 'Tất cả' && !selectedType)) ? 'primary' : 'default'}
              onClick={() => {
                const newType = t === 'Tất cả' ? null : t;
                setSelectedType(newType);
                loadData(1, newType);
              }}
            >
              {t === 'Tất cả' ? 'Tất cả' : getTypeLabel(t)}
            </Button>
          ))}
        </Space>

        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          pagination={{ ...pagination, onChange: (page) => loadData(page) }} />
      </Card>

      <Modal title="Gửi thông báo mới" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={isSubmitting} onClick={handleCreateSubmit}>Gửi đi</Button>
        ]} width={750}
      >
        <Form form={createForm} layout="vertical" initialValues={{ type: 'GENERAL', targetType: 'ALL' }}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="Nhập tiêu đề..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Loại thông báo">
                <Select options={[
                  { value: 'GENERAL', label: 'Chung' }, { value: 'PAYMENT', label: 'Thanh toán' },
                  { value: 'MAINTENANCE', label: 'Bảo trì' }, { value: 'EMERGENCY', label: 'Khẩn cấp' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetType" label="Đối tượng nhận">
                <Select options={[
                  { value: 'ALL', label: 'Tất cả hệ thống (Gửi chung)' },
                  { value: 'SPECIFIC', label: 'Tùy chỉnh (Tòa / Tầng / Căn hộ)' },
                ]} onChange={() => { setSelectedFloor(null); setSelectedAptIds([]); }} />
              </Form.Item>
            </Col>
          </Row>

          {targetTypeWatch === 'SPECIFIC' && (
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="selectedBuildingId" label="Chọn Tòa nhà" rules={[{ required: true, message: 'Bắt buộc' }]}>
                    <Select placeholder="Chọn tòa..." options={buildingList.map(b => ({ label: b.name || b.code, value: b.id }))}
                      onChange={() => { setSelectedFloor(null); setSelectedAptIds([]); }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Chọn Tầng">
                    <Select disabled={!selectedBuildingWatch} value={selectedFloor} placeholder="Gửi cả tòa..."
                      onChange={(v) => { setSelectedFloor(v); setSelectedAptIds([]); }}
                      options={Array.from({length: 10}, (_, i) => ({ label: `Tầng ${i + 1}`, value: i + 1 }))} />
                  </Form.Item>
                </Col>
              </Row>

              {selectedFloor && (
                <div style={{ marginTop: 15 }}>
                  <div style={{ marginBottom: 10, fontWeight: 600 }}>Lưới căn hộ Tầng {selectedFloor}:</div>
                  
                  {apartmentList.length === 0 && (
                    <div style={{ color: 'red', fontStyle: 'italic', marginBottom: 10 }}>
                      ⚠️ Lỗi API: Backend không trả về mảng dữ liệu căn hộ cho Tòa nhà này.
                    </div>
                  )}

                  {apartmentList.length > 0 && filteredApartments.length === 0 && (
                    <div style={{ color: '#d97706', fontStyle: 'italic', marginBottom: 10, padding: 10, background: '#fef3c7', borderRadius: 8 }}>
                      ⚠️ Không lọc được tầng {selectedFloor}. Dữ liệu thô từ API của bạn trông như thế này:<br/>
                      <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>{JSON.stringify(apartmentList[0])}</code>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {filteredApartments.map(apt => {
                      const codeStr = String(apt.code || apt.apartmentCode || apt.id);
                      const displayCode = codeStr.length >= 4 ? codeStr.slice(-4) : codeStr;
                      return (
                        <Button key={apt.id} type={selectedAptIds.includes(apt.id) ? 'primary' : 'default'}
                          onClick={() => toggleApartment(apt.id)} style={{ height: '45px', fontWeight: 'bold' }}>
                          {displayCode}
                        </Button>
                      )
                    })}
                  </div>
                  
                  {selectedAptIds.length > 0 && (
                    <div style={{ marginTop: 10, color: 'var(--accent)', fontSize: '12px' }}>
                      Đã chọn {selectedAptIds.length} căn hộ. Bỏ chọn tất cả để gửi cho cả tầng.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
            <TextArea rows={4} placeholder="Nhập chi tiết thông báo..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Chi tiết thông báo" open={isDetailModalOpen} onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Popconfirm key="del" title="Xóa thông báo này?" onConfirm={handleDelete}>
            <Button danger>Xóa thông báo</Button>
          </Popconfirm>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
          <Button key="upd" type="primary" disabled={!isDirty} onClick={handleUpdate}>Cập nhật</Button>
        ]} width={600}
      >
        <Form form={detailForm} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Loại">
            <Select options={[{ value: 'GENERAL', label: 'Chung' }, { value: 'PAYMENT', label: 'Thanh toán' },
              { value: 'MAINTENANCE', label: 'Bảo trì' }, { value: 'EMERGENCY', label: 'Khẩn cấp' }]} />
          </Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}><TextArea rows={6} /></Form.Item>
          <div style={{ color: '#999', fontSize: '12px' }}>
            Ngày tạo: {editingNoti?.createdAt ? new Date(editingNoti.createdAt).toLocaleString('vi-VN') : '-'} | Người tạo: {editingNoti?.createdBy || 'Hệ thống'}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationManagement;