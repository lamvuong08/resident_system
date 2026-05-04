import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/api";

const { Title } = Typography;
const { TextArea } = Input;

interface Notification {
  id: number;
  title: string;
  content: string;
  type: "GENERAL" | "PAYMENT" | "MAINTENANCE" | "EMERGENCY";
  createdAt: string;
  createdBy?: string;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case "GENERAL":
      return "blue";
    case "PAYMENT":
      return "green";
    case "MAINTENANCE":
      return "gold";
    case "EMERGENCY":
      return "red";
    default:
      return "default";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "GENERAL":
      return "Chung";
    case "PAYMENT":
      return "Thanh toán";
    case "MAINTENANCE":
      return "Bảo trì";
    case "EMERGENCY":
      return "Khẩn cấp";
    default:
      return type;
  }
};

const NotificationManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const buildingIdParam = searchParams.get("b");
  const floorParam = searchParams.get("f");

  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

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

  const targetTypeWatch = Form.useWatch("targetType", createForm);

  const [buildingList, setBuildingList] = useState<any[]>([]);
  const [apartmentList, setApartmentList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedAptIds, setSelectedAptIds] = useState<number[]>([]);

  const toggleApartment = (aptId: number) => {
    setSelectedAptIds((prev) =>
      prev.includes(aptId)
        ? prev.filter((id) => id !== aptId)
        : [...prev, aptId],
    );
  };

  const loadData = async (page = pagination.current, type = selectedType) => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications`, {
        params: {
          page: page - 1,
          size: pagination.pageSize,
          type: type || undefined,
        },
      });
      setData(res.data.content || []);
      setPagination((prev) => ({
        ...prev,
        current: page,
        total: res.data.totalElements || 0,
      }));
    } catch (error) {
      message.error("Lỗi khi tải danh sách thông báo");
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    try {
      const res = await api.get("/dashboard/buildings");
      setBuildingList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      message.error("Không tải được danh sách tòa nhà");
    }
  };

  useEffect(() => {
    const fetchApts = async () => {
      if (buildingIdParam) {
        try {
          const res = await api.get("/apartments/filter", {
            params: {
              buildingId: buildingIdParam,
              floor: floorParam || undefined,
            },
          });
          setApartmentList(res.data);
        } catch (error) {
          console.error("Lỗi API filter apartments:", error);
          setApartmentList([]);
        }
      } else {
        setApartmentList([]);
      }
    };
    fetchApts();
  }, [buildingIdParam, floorParam]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isCreateModalOpen && buildingList.length === 0) loadBuildings();

    if (isCreateModalOpen && buildingIdParam) {
      createForm.setFieldsValue({
        selectedBuildingId: buildingIdParam,
        targetType: "SPECIFIC",
      });
    }
  }, [isCreateModalOpen, buildingIdParam, createForm, buildingList]);

  const handleOpenCreate = () => {
    createForm.resetFields();
    setSelectedAptIds([]);
    setSearchParams({});
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      setIsSubmitting(true);

      let finalTargetType = "ALL";
      let targetIds: number[] = [];
      let floorNumber = floorParam ? Number(floorParam) : null;

      if (values.targetType === "SPECIFIC") {
        if (selectedAptIds.length > 0) {
          finalTargetType = "APARTMENT";
          targetIds = selectedAptIds;
        } else if (floorNumber) {
          finalTargetType = "FLOOR";
          targetIds = [Number(buildingIdParam)];
        } else {
          finalTargetType = "BUILDING";
          targetIds = [Number(buildingIdParam)];
        }
      }

      await api.post("/notifications", {
        title: values.title,
        content: values.content,
        type: values.type,
        targetType: finalTargetType,
        targetIds,
        floorNumber,
      });

      message.success("Gửi thông báo thành công");
      setIsCreateModalOpen(false);
      setSearchParams({});
      loadData(1);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error("Lỗi khi gửi thông báo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetails = (noti: Notification) => {
    setEditingNoti(noti);
    detailForm.setFieldsValue({
      title: noti.title,
      content: noti.content,
      type: noti.type,
    });
    setIsDetailModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingNoti) return;
    try {
      const values = await detailForm.validateFields();
      await api.put(`/notifications/${editingNoti.id}`, values);
      message.success("Cập nhật thông báo thành công");
      setIsDetailModalOpen(false);
      loadData();
    } catch (error) {
      message.error("Không thể cập nhật thông báo");
    }
  };

  const handleDelete = async () => {
    if (!editingNoti) return;
    try {
      await api.delete(`/notifications/${editingNoti.id}`);
      message.success("Đã xóa thông báo");
      setIsDetailModalOpen(false);
      loadData();
    } catch (error) {
      message.error("Xóa thông báo thất bại");
    }
  };

  const showDeleteConfirm = () => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa thông báo này? Thao tác này không thể hoàn tác.",
      okText: "Xóa",
      cancelText: "Hủy",
      okType: "danger",
      centered: true,
      okButtonProps: { style: { height: 32 } },
      cancelButtonProps: { style: { height: 32 } },
      onOk: handleDelete,
    });
  };

  const columns = [
    { title: "Thông báo", dataIndex: "title", key: "title" },
    {
      title: "Phân loại",
      dataIndex: "type",
      key: "type",
      width: 150,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{getTypeLabel(type)}</Tag>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) =>
        date ? new Date(date).toLocaleString("vi-VN") : "-",
    },
    {
      key: "action",
      width: 120,
      render: (_: any, record: Notification) => (
        <Button type="link" onClick={() => handleOpenDetails(record)} style={{ height: 32 }}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Quản lý thông báo
        </Title>
        <Button
          type="primary"
          style={{ background: "var(--accent)" }}
          onClick={handleOpenCreate}
        >
          + Thêm mới
        </Button>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Space style={{ marginBottom: 16 }}>
          {["Tất cả", "GENERAL", "PAYMENT", "MAINTENANCE", "EMERGENCY"].map(
            (t) => (
              <Button
                key={t}
                style={{ height: 32 }}
                type={
                  selectedType === t || (t === "Tất cả" && !selectedType)
                    ? "primary"
                    : "default"
                }
                onClick={() => {
                  const newType = t === "Tất cả" ? null : t;
                  setSelectedType(newType);
                  loadData(1, newType);
                }}
              >
                {t === "Tất cả" ? "Tất cả" : getTypeLabel(t)}
              </Button>
            ),
          )}
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
        title="Gửi thông báo mới"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCreateModalOpen(false)} style={{ height: 32 }}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSubmitting}
            onClick={handleCreateSubmit}
            style={{ height: 32 }}
          >
            Gửi đi
          </Button>,
        ]}
        width={750}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ type: "GENERAL", targetType: "ALL" }}
        >
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
          >
            <Input placeholder="Nhập tiêu đề..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Loại thông báo">
                <Select
                  options={[
                    { value: "GENERAL", label: "Chung" },
                    { value: "PAYMENT", label: "Thanh toán" },
                    { value: "MAINTENANCE", label: "Bảo trì" },
                    { value: "EMERGENCY", label: "Khẩn cấp" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetType" label="Đối tượng nhận">
                <Select
                  options={[
                    { value: "ALL", label: "Tất cả hệ thống (Gửi chung)" },
                    {
                      value: "SPECIFIC",
                      label: "Tùy chỉnh (Tòa / Tầng / Căn hộ)",
                    },
                  ]}
                  onChange={() => {
                    setSearchParams({});
                    setSelectedAptIds([]);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {targetTypeWatch === "SPECIFIC" && (
            <div
              style={{
                background: "#f8fafc",
                padding: 20,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                marginBottom: 16,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="selectedBuildingId"
                    label="Chọn Tòa nhà"
                    rules={[{ required: true, message: "Bắt buộc" }]}
                  >
                    <Select
                      placeholder="Chọn tòa..."
                      options={buildingList.map((b) => ({
                        label: b.name || b.code,
                        value: String(b.id),
                      }))}
                      onChange={(val) => {
                        setSearchParams({ b: val });
                        setSelectedAptIds([]);
                        createForm.setFieldsValue({ selectedBuildingId: val });
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Chọn Tầng">
                    <Select
                      disabled={!buildingIdParam}
                      value={floorParam ? Number(floorParam) : null}
                      placeholder="Gửi cả tòa..."
                      onChange={(f) => {
                        setSearchParams({
                          b: buildingIdParam!,
                          f: f.toString(),
                        });
                        setSelectedAptIds([]);
                      }}
                      options={Array.from({ length: 10 }, (_, i) => ({
                        label: `Tầng ${i + 1}`,
                        value: i + 1,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {buildingIdParam && (
                <div style={{ marginTop: 15 }}>
                  <div style={{ marginBottom: 10, fontWeight: 600 }}>
                    {(() => {
                      const building = buildingList.find(
                        (b) => String(b.id) === String(buildingIdParam),
                      );
                      const bName = building
                        ? building.name || building.code
                        : "...";
                      const fName = floorParam
                        ? `Tầng ${floorParam}`
                        : "Tất cả tầng";
                      return `Căn hộ thuộc ${bName} - ${fName}:`;
                    })()}
                  </div>
                  {apartmentList.length === 0 ? (
                    <div style={{ color: "#999", fontStyle: "italic" }}>
                      Không tìm thấy dữ liệu căn hộ.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(100px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {apartmentList.map((apt) => (
                        <Button
                          key={apt.id}
                          type={
                            selectedAptIds.includes(apt.id)
                              ? "primary"
                              : "default"
                          }
                          onClick={() => toggleApartment(apt.id)}
                          style={{
                            height: 32,
                            fontWeight: "bold",
                            background: selectedAptIds.includes(apt.id)
                              ? "#1890ff"
                              : "#fff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {apt.code}
                        </Button>
                      ))}
                    </div>
                  )}
                  {selectedAptIds.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        color: "#1890ff",
                        fontSize: "12px",
                      }}
                    >
                      Đã chọn {selectedAptIds.length} căn hộ.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
          >
            <TextArea rows={4} placeholder="Nhập chi tiết thông báo..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chi tiết thông báo"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="del" danger style={{ height: 32 }} onClick={showDeleteConfirm}>
            Xóa thông báo
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)} style={{ height: 32 }}>
            Đóng
          </Button>,
          <Button
            key="upd"
            type="primary"
            disabled={!isDirty}
            onClick={handleUpdate}
            style={{ height: 32 }}
          >
            Cập nhật
          </Button>,
        ]}
        width={600}
      >
        <Form form={detailForm} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Loại">
            <Select
              options={[
                { value: "GENERAL", label: "Chung" },
                { value: "PAYMENT", label: "Thanh toán" },
                { value: "MAINTENANCE", label: "Bảo trì" },
                { value: "EMERGENCY", label: "Khẩn cấp" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true }]}
          >
            <TextArea rows={6} />
          </Form.Item>
          <div style={{ color: "#999", fontSize: "12px" }}>
            Ngày tạo:{" "}
            {editingNoti?.createdAt
              ? new Date(editingNoti.createdAt).toLocaleString("vi-VN")
              : "-"}{" "}
            | Người tạo: {editingNoti?.createdBy || "Hệ thống"}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationManagement;
