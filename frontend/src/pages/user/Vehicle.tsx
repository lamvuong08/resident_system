import React, { useEffect, useState } from 'react'
import {
    Button,
    Card,
    Form,
    Input,
    Modal,
    Select,
    Table,
    Tag,
    Upload,
    Image,
    Typography,
    message,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import type { VehicleRow } from '../../utils/vehicleApi'
import {
    fetchUserVehicles,
    createUserVehicle,
    getVehicleTypeLabel,
    getVehicleStatusLabel,
    getVehicleThumbnailUrl,
} from '../../utils/vehicleApi'
import { extractApiError } from '../../utils/api'
import '../../styles/user-vehicle.css'

const { Text } = Typography

const UserVehicle: React.FC = () => {
    const [loading, setLoading] = useState(false)
    const [vehicles, setVehicles] = useState<VehicleRow[]>([])

    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [createForm] = Form.useForm()
    const [createLoading, setCreateLoading] = useState(false)
    const [fileList, setFileList] = useState<UploadFile[]>([])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchUserVehicles()
            setVehicles(data)
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi tải danh sách phương tiện'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'warning'
            case 'ACTIVE':
                return 'success'
            case 'REJECTED':
                return 'error'
            default:
                return 'default'
        }
    }

    const columns: ColumnsType<VehicleRow> = [
        {
            title: 'Ảnh',
            key: 'thumbnail',
            width: 84,
            render: (_, row) => {
                const thumbUrl = getVehicleThumbnailUrl(row)
                if (!thumbUrl) {
                    return <Text type="secondary">-</Text>
                }
                return <Image src={thumbUrl} width={56} height={40} style={{ objectFit: 'cover', borderRadius: 6 }} preview={{ mask: false }} />
            },
        },
        {
            title: 'Biển số',
            dataIndex: 'licensePlate',
            key: 'licensePlate',
            render: (val: string) => <Text strong>{val}</Text>,
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (val: string) => getVehicleTypeLabel(val),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (val: string) => (
                <Tag color={getStatusColor(val)}>{getVehicleStatusLabel(val)}</Tag>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (val: string) => {
                if (!val) return ''
                const d = new Date(val)
                return (
                    d.toLocaleDateString('vi-VN') +
                    ' ' +
                    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                )
            },
        },
    ]

    const handleCreatePrompt = () => {
        createForm.resetFields()
        setFileList([])
        setCreateModalOpen(true)
    }

    const handleUploadChange = ({ fileList: nextFileList }: { fileList: UploadFile[] }) => {
        setFileList(nextFileList.slice(-1))
    }

    const submitCreate = async () => {
        try {
            const values = await createForm.validateFields()
            const file = fileList[0]?.originFileObj as File | undefined
            if (!file) {
                message.error('Vui lòng chọn ít nhất 1 ảnh xe')
                return
            }
            setCreateLoading(true)
            await createUserVehicle({
                licensePlate: values.licensePlate,
                type: values.type,
                file,
            })
            message.success('Đã gửi yêu cầu đăng ký phương tiện')
            setCreateModalOpen(false)
            loadData()
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'errorFields' in err) return
            message.error(extractApiError(err, 'Lỗi đăng ký phương tiện'))
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <div className="user-vehicle-page">
            <div className="user-vehicle-header">
                <div className="user-vehicle-header-left">
                    <h2>Phương tiện của tôi</h2>
                    <p>Danh sách các phương tiện di chuyển được đăng ký tại căn hộ của bạn</p>
                </div>
            </div>

            <Card className="user-vehicle-card" bodyStyle={{ padding: 20 }}>
                <div className="user-vehicle-table-toolbar">
                    <Button
                        type="primary"
                        className="fix-height-32"
                        icon={<PlusOutlined />}
                        onClick={handleCreatePrompt}
                    >
                        Thêm phương tiện
                    </Button>
                </div>
                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={vehicles}
                    pagination={false}
                    size="small"
                />
            </Card>

            <Modal
                title="Thêm phương tiện mới"
                open={createModalOpen}
                onCancel={() => setCreateModalOpen(false)}
                onOk={() => void submitCreate()}
                confirmLoading={createLoading}
                okText="Gửi đăng ký"
                cancelText="Hủy"
                okButtonProps={{ className: 'fix-height-32' }}
                cancelButtonProps={{ className: 'fix-height-32' }}
                destroyOnClose
            >
                <Form form={createForm} layout="vertical">
                    <Form.Item
                        name="licensePlate"
                        label="Biển số xe"
                        rules={[
                            { required: true, message: 'Bắt buộc nhập biển số xe!' },
                            { min: 3, message: 'Biển số quá ngắn!' }
                        ]}
                    >
                        <Input className="fix-height-32" placeholder="Ví dụ: 29A-123.45" />
                    </Form.Item>
                    <Form.Item
                        name="type"
                        label="Loại phương tiện"
                        rules={[{ required: true, message: 'Bắt buộc chọn loại phương tiện!' }]}
                    >
                        <Select
                            className="fix-height-32"
                            placeholder="Chọn loại phương tiện"
                            options={[
                                { value: 'CAR', label: 'Ô tô' },
                                { value: 'MOTORBIKE', label: 'Xe máy' },
                                { value: 'BICYCLE', label: 'Xe đạp' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Ảnh xe" required>
                        <Upload
                            accept="image/jpeg,image/png"
                            listType="picture-card"
                            fileList={fileList}
                            beforeUpload={() => false}
                            onChange={handleUploadChange}
                            maxCount={1}
                        >
                            {fileList.length >= 1 ? null : (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>Tải ảnh</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>
                    <Text type="secondary">Chỉ chấp nhận JPG/PNG, tối đa 5MB.</Text>
                </Form>
            </Modal>
        </div>
    )
}

export default UserVehicle
