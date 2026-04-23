import React, { useEffect, useState, useMemo } from 'react';
import { Table, Tag, Space, Button, Card, Typography, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
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

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoti, setEditingNoti] = useState<Notification | null>(null);
  const [form] = Form.useForm();
  
  // Logic kiểm tra thay đổi nội dung (isDirty)
  const formValues = Form.useWatch([], form);
  const isDirty = useMemo(() => {
    if (!editingNoti || !formValues) return false;
    return (
      formValues.title !== editingNoti.title ||
      formValues.content !== editingNoti.content ||
      formValues.type !== editingNoti.type
    );
  }, [formValues, editingNoti]);

  const loadData = async (page = pagination.current, type = selectedType) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/notifications`, {
        params: {
          page: page - 1,
          size: pagination.pageSize,
          type: type || undefined
        }
      });
      setData(res.data.content);
      setPagination(prev => ({ ...prev, current: page, total: res.data.totalElements }));
    } catch (error) {
      message.error('Lỗi khi tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const columns = [
    { title: 'Thông báo', dataIndex: 'title', key: 'title' },
    {
      title: 'Phân loại',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type: string) => <Tag color={getTypeColor(type)}>{getTypeLabel(type)}</Tag>
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString('vi-VN') : '-'
    },
    {
      title: '', // Gộp hành động vào Chi tiết, không cần tiêu đề cột
      key: 'action',
      width: 100,
      render: (_: any, record: Notification) => (
        <Button type="link" onClick={() => handleOpenDetails(record)}>Chi tiết</Button>
      )
    }
  ];

  const handleOpenDetails = (noti: Notification) => {
    setEditingNoti(noti);
    form.setFieldsValue({
      title: noti.title,
      content: noti.content,
      type: noti.type
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingNoti) return;
    try {
      const values = await form.validateFields();
      await api.put(`/api/notifications/${editingNoti.id}`, values);
      message.success('Cập nhật thông báo thành công');
      setIsModalOpen(false);
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
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Xóa thông báo thất bại');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3}>Quản lý thông báo</Title>
        <Button type="primary" style={{ background: 'var(--accent)' }}>+ Thêm mới</Button>
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

        <Table 
          dataSource={data} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ ...pagination, onChange: (page) => loadData(page) }}
        />
      </Card>

      <Modal
        title="Chi tiết thông báo"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Popconfirm 
            key="del" 
            title="Xóa thông báo này?" 
            description="Hành động này không thể hoàn tác."
            onConfirm={handleDelete} 
            okText="Xóa" 
            cancelText="Hủy"
          >
            <Button danger>Xóa thông báo</Button>
          </Popconfirm>,
          <Button key="close" onClick={() => setIsModalOpen(false)}>Đóng</Button>,
          <Button key="upd" type="primary" disabled={!isDirty} onClick={handleUpdate}>Cập nhật</Button>
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="Nhập tiêu đề thông báo..." />
          </Form.Item>
          <Form.Item name="type" label="Loại thông báo">
            <Select options={[
              { value: 'GENERAL', label: 'Chung' },
              { value: 'PAYMENT', label: 'Thanh toán' },
              { value: 'MAINTENANCE', label: 'Bảo trì' },
              { value: 'EMERGENCY', label: 'Khẩn cấp' },
            ]} />
          </Form.Item>
          <Form.Item name="content" label="Nội dung chi tiết" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
            <TextArea rows={6} placeholder="Nội dung thông báo..." />
          </Form.Item>
          <div style={{ color: '#999', fontSize: '12px', marginTop: 10 }}>
            Ngày tạo: {editingNoti?.createdAt ? new Date(editingNoti.createdAt).toLocaleString('vi-VN') : '-'} 
            | Người tạo: {editingNoti?.createdBy || 'Hệ thống'}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationManagement;