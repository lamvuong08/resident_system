import React, { useEffect, useState } from 'react'
import {
    Button,
    Card,
    Col,
    Descriptions,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    Empty,
    Image,
    message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { VehicleRow } from '../../utils/vehicleApi'
import {
    fetchAdminVehicles,
    updateVehicleStatus,
    deleteVehicle,
    getVehicleTypeLabel,
    getVehicleStatusLabel,
    getVehicleThumbnailUrl,
    resolveVehicleMediaUrl,
} from '../../utils/vehicleApi'
import SlidingPaginationFooter from '../../components/SlidingPaginationFooter'
import { PAGE_SIZE } from '../../utils/pagination'
import { extractApiError } from '../../utils/api'

const { Text } = Typography

const VehicleManagement: React.FC = () => {
    const [loading, setLoading] = useState(false)
    const [rows, setRows] = useState<VehicleRow[]>([])

    const [keyword, setKeyword] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('ALL')

    const [currentPage, setCurrentPage] = useState(1)
    const [totalElements, setTotalElements] = useState(0)

    const [actionLoading, setActionLoading] = useState(false)
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleRow | null>(null)

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await fetchAdminVehicles({
                page: currentPage,
                size: PAGE_SIZE,
                status: filterStatus,
                searchQuery: keyword
            })
            setRows(res.items)
            setTotalElements(res.totalElements)
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi tải danh sách phương tiện'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [currentPage, filterStatus, keyword])

    useEffect(() => {
        setCurrentPage(1)
    }, [filterStatus, keyword])

    const handleRefresh = () => {
        loadData()
        message.success('Đã làm mới danh sách')
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'warning'
            case 'ACTIVE': return 'success'
            case 'REJECTED': return 'error'
            default: return 'default'
        }
    }

    const handleApprove = async (id: number) => {
        setActionLoading(true)
        try {
            await updateVehicleStatus(id, 'ACTIVE')
            message.success('Đã phê duyệt phương tiện')
            loadData()
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi cập nhật phương tiện'))
        } finally {
            setActionLoading(false)
        }
    }

    const handleReject = async (id: number) => {
        setActionLoading(true)
        try {
            await updateVehicleStatus(id, 'REJECTED')
            message.success('Đã từ chối phương tiện')
            loadData()
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi cập nhật phương tiện'))
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = (id: number) => {
        Modal.confirm({
            title: 'Xóa phương tiện',
            content: 'Bạn có chắc chắn muốn xóa phương tiện này không?',
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true, className: 'fix-height-32' },
            cancelButtonProps: { className: 'fix-height-32' },
            onOk: async () => {
                try {
                    await deleteVehicle(id)
                    message.success('Đã xóa phương tiện')
                    loadData()
                } catch (err) {
                    message.error(extractApiError(err, 'Lỗi xóa phương tiện'))
                }
            }
        })
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
            width: 120,
            render: (val: string) => <Text strong>{val}</Text>,
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (val: string) => getVehicleTypeLabel(val),
        },
        {
            title: 'Cư dân',
            key: 'residentName',
            width: 150,
            render: (_, row) => row.resident ? row.resident.name : 'N/A',
        },
        {
            title: 'Căn hộ',
            key: 'apartment',
            width: 100,
            render: (_, row) => row.resident ? row.resident.apartment : 'N/A',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (val: string) => (
                <Tag color={getStatusColor(val)}>{getVehicleStatusLabel(val)}</Tag>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 140,
            render: (val: string) => {
                if (!val) return ''
                const d = new Date(val)
                return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 200,
            align: 'center',
            render: (_, row: VehicleRow) => (
                <Space>
                    {row.status === 'PENDING' && (
                        <>
                            <Button className="fix-height-24" type="primary" size="small" loading={actionLoading} onClick={(event) => { event.stopPropagation(); void handleApprove(row.id) }}>Duyệt</Button>
                            <Button className="fix-height-24" danger size="small" loading={actionLoading} onClick={(event) => { event.stopPropagation(); void handleReject(row.id) }}>Từ chối</Button>
                        </>
                    )}
                    <Button className="fix-height-24" type="link" danger size="small" onClick={(event) => { event.stopPropagation(); handleDelete(row.id) }}>Xóa</Button>
                </Space>
            ),
        },
    ]

    return (
        <div className="vehicle-management-page">
            <Card className="vehicle-filter-card" style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} md={10} lg={8}>
                        <Input
                            allowClear
                            className="fix-height-32"
                            placeholder="Tìm theo biển số, cư dân..."
                            prefix={<SearchOutlined />}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </Col>
                    <Col xs={12} md={8} lg={6}>
                        <Select
                            className="vehicle-filter-control fix-height-32"
                            style={{ width: '100%' }}
                            value={filterStatus}
                            onChange={(v) => setFilterStatus(v)}
                            options={[
                                { value: 'ALL', label: 'Tất cả trạng thái' },
                                { value: 'ACTIVE', label: 'Đã duyệt' },
                                { value: 'PENDING', label: 'Chờ duyệt' },
                                { value: 'REJECTED', label: 'Từ chối' },
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={6} lg={10} style={{ textAlign: 'right' }}>
                        <Button className="fix-height-32" icon={<ReloadOutlined />} onClick={handleRefresh}>
                            Làm mới
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Card className="vehicle-table-card" bodyStyle={{ padding: '16px' }}>
                <Table
                    rowKey="id"
                    loading={loading}
                    size="small"
                    columns={columns}
                    dataSource={rows}
                    pagination={false}
                    onRow={(row) => ({
                        onClick: () => setSelectedVehicle(row),
                        style: { cursor: 'pointer' },
                    })}
                />
                <SlidingPaginationFooter
                    total={totalElements}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    totalLabel={`Tổng ${totalElements} phương tiện`}
                />
            </Card>

            <Modal
                title={selectedVehicle ? `Chi tiết phương tiện - ${selectedVehicle.licensePlate}` : 'Chi tiết phương tiện'}
                open={!!selectedVehicle}
                onCancel={() => setSelectedVehicle(null)}
                footer={null}
                width={860}
                destroyOnClose
            >
                {selectedVehicle && (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Descriptions bordered column={2} size="small">
                            <Descriptions.Item label="Biển số">{selectedVehicle.licensePlate}</Descriptions.Item>
                            <Descriptions.Item label="Loại">{getVehicleTypeLabel(selectedVehicle.type)}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={selectedVehicle.status === 'ACTIVE' ? 'success' : selectedVehicle.status === 'REJECTED' ? 'error' : 'warning'}>
                                    {getVehicleStatusLabel(selectedVehicle.status)}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Cư dân">{selectedVehicle.resident?.name ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Căn hộ">{selectedVehicle.resident?.apartment ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">{selectedVehicle.createdAt ? new Date(selectedVehicle.createdAt).toLocaleString('vi-VN') : '-'}</Descriptions.Item>
                        </Descriptions>

                        <div>
                            <Text strong>Hình ảnh</Text>
                            <div style={{ marginTop: 12 }}>
                                {selectedVehicle.attachments && selectedVehicle.attachments.length > 0 ? (
                                    <Space wrap size={12}>
                                        {selectedVehicle.attachments.map((attachment) => (
                                            <Image
                                                key={attachment.id}
                                                src={resolveVehicleMediaUrl(attachment.fileUrl)}
                                                width={160}
                                                height={120}
                                                style={{ objectFit: 'cover', borderRadius: 8 }}
                                            />
                                        ))}
                                    </Space>
                                ) : (
                                    <Empty description="Chưa có ảnh phương tiện" />
                                )}
                            </div>
                        </div>

                        {selectedVehicle.status === 'PENDING' && (
                            <Space>
                                <Button type="primary" loading={actionLoading} onClick={() => void handleApprove(selectedVehicle.id)}>
                                    Duyệt
                                </Button>
                                <Button danger loading={actionLoading} onClick={() => void handleReject(selectedVehicle.id)}>
                                    Từ chối
                                </Button>
                            </Space>
                        )}
                    </Space>
                )}
            </Modal>
        </div>
    )
}

export default VehicleManagement
