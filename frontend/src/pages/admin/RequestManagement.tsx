import React, { useEffect, useState } from 'react'
import {
    Button,
    Card,
    Col,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
    Typography,
    message,
    Form
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { AdminRequestRow } from '../../utils/adminSupportApi'
import {
    fetchAdminRequests,
    setAdminRequestInProgress,
    setAdminRequestCompleted,
    setAdminRequestRejected,
    getAdminRequestTypeLabel,
    getAdminRequestStatusLabel,
} from '../../utils/adminSupportApi'
import SlidingPaginationFooter from '../../components/SlidingPaginationFooter'
import { PAGE_SIZE } from '../../utils/pagination'
import { formatUserRequestDate } from '../../utils/userSupportApi'
import { extractApiError } from '../../utils/api'

const { Text } = Typography

const RequestManagement: React.FC = () => {
    const [loading, setLoading] = useState(false)
    const [rows, setRows] = useState<AdminRequestRow[]>([])

    const [keyword, setKeyword] = useState('')
    const [activeTab, setActiveTab] = useState<string>('ALL')
    const [filterType, setFilterType] = useState<string>('ALL')

    const [currentPage, setCurrentPage] = useState(1)
    const [totalElements, setTotalElements] = useState(0)

    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedReq, setSelectedReq] = useState<AdminRequestRow | null>(null)

    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [rejectForm] = Form.useForm()
    const [rejectLoading, setRejectLoading] = useState(false)

    const [actionLoading, setActionLoading] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await fetchAdminRequests({
                page: currentPage,
                size: PAGE_SIZE,
                status: activeTab,
                type: filterType,
                searchQuery: keyword
            })
            setRows(res.items)
            setTotalElements(res.totalElements)
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi tải danh sách yêu cầu'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [currentPage, activeTab, filterType, keyword])

    useEffect(() => {
        setCurrentPage(1)
    }, [activeTab, filterType, keyword])

    const handleRefresh = () => {
        loadData()
        message.success('Đã tải lại danh sách')
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'warning'
            case 'IN_PROGRESS': return 'processing'
            case 'COMPLETED': return 'success'
            case 'REJECTED': return 'error'
            default: return 'default'
        }
    }

    const columns: ColumnsType<AdminRequestRow> = [
        {
            title: 'Mã',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            render: (val: number) => <Text strong>#{val}</Text>,
        },
        {
            title: 'Tên cư dân',
            dataIndex: ['resident', 'name'],
            key: 'residentName',
            width: 150,
            ellipsis: true,
        },
        {
            title: 'Căn hộ',
            dataIndex: ['resident', 'apartment'],
            key: 'apartment',
            width: 100,
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 140,
            render: (val: string) => formatUserRequestDate(val),
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (val: string) => getAdminRequestTypeLabel(val),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (val: string) => (
                <Tag color={getStatusColor(val)}>{getAdminRequestStatusLabel(val)}</Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 100,
            align: 'center',
            render: (_, row: AdminRequestRow) => (
                <Button type="link" size="small" onClick={() => { setSelectedReq(row); setDetailModalOpen(true); }}>
                    Chi tiết
                </Button>
            ),
        },
    ]

    const handleAccept = async () => {
        if (!selectedReq) return
        setActionLoading(true)
        try {
            await setAdminRequestInProgress(selectedReq.id)
            message.success('Đã nhận xử lý yêu cầu')
            setDetailModalOpen(false)
            loadData()
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi cập nhật yêu cầu'))
        } finally {
            setActionLoading(false)
        }
    }

    const handleComplete = async () => {
        if (!selectedReq) return
        setActionLoading(true)
        try {
            await setAdminRequestCompleted(selectedReq.id)
            message.success('Đã hoàn thành yêu cầu')
            setDetailModalOpen(false)
            loadData()
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi cập nhật yêu cầu'))
        } finally {
            setActionLoading(false)
        }
    }

    const handleRejectPrompt = () => {
        rejectForm.resetFields()
        setRejectModalOpen(true)
    }

    const submitReject = async () => {
        if (!selectedReq) return
        try {
            const values = await rejectForm.validateFields()
            setRejectLoading(true)
            await setAdminRequestRejected(selectedReq.id, values.reason)
            message.success('Đã từ chối yêu cầu')
            setRejectModalOpen(false)
            setDetailModalOpen(false)
            loadData()
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'errorFields' in err) return
            message.error(extractApiError(err, 'Lỗi cập nhật yêu cầu'))
        } finally {
            setRejectLoading(false)
        }
    }

    return (
        <div className="request-management-page">
            <Card className="request-filter-card" style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} md={10} lg={8}>
                        <Input
                            allowClear
                            className="fix-height-32"
                            placeholder="Tìm theo mã hoặc nội dung..."
                            prefix={<SearchOutlined />}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </Col>
                    <Col xs={12} md={8} lg={6}>
                        <Select
                            className="request-filter-control fix-height-32"
                            style={{ width: '100%' }}
                            value={filterType}
                            onChange={(v) => setFilterType(v)}
                            options={[
                                { value: 'ALL', label: 'Tất cả loại' },
                                { value: 'REPAIR', label: 'Sửa chữa' },
                                { value: 'COMPLAINT', label: 'Khiếu nại' },
                                { value: 'SUPPORT', label: 'Hỗ trợ' },
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

            <Card className="request-table-card" bodyStyle={{ padding: '0 16px 16px' }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { key: 'ALL', label: 'Tất cả' },
                        { key: 'PENDING', label: 'Chờ xử lý' },
                        { key: 'IN_PROGRESS', label: 'Đang xử lý' },
                        { key: 'COMPLETED', label: 'Hoàn thành' },
                        { key: 'REJECTED', label: 'Đã từ chối' },
                    ]}
                />
                <Table
                    rowKey="id"
                    loading={loading}
                    size="small"
                    columns={columns}
                    dataSource={rows}
                    pagination={false}
                />
                <SlidingPaginationFooter
                    total={totalElements}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    totalLabel={`Tổng ${totalElements} yêu cầu`}
                />
            </Card>

            <Modal
                title={`Chi tiết yêu cầu #${selectedReq?.id}`}
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                footer={null}
                width={600}
                destroyOnClose
            >
                {selectedReq && (
                    <div>
                        <Row style={{ marginBottom: 16 }}>
                            <Col span={12}>
                                <Text type="secondary">Cư dân: </Text> <Text strong>{selectedReq.resident.name}</Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Căn hộ: </Text> <Text>{selectedReq.resident.apartment}</Text>
                            </Col>
                        </Row>
                        <Row style={{ marginBottom: 16 }}>
                            <Col span={12}>
                                <Text type="secondary">Ngày gửi: </Text>
                                <Text>{formatUserRequestDate(selectedReq.createdAt)}</Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Trạng thái: </Text>
                                <Tag color={getStatusColor(selectedReq.status)}>
                                    {getAdminRequestStatusLabel(selectedReq.status)}
                                </Tag>
                            </Col>
                        </Row>
                        <div style={{ marginBottom: 12 }}>
                            <Text type="secondary">Loại yêu cầu:</Text>{' '}
                            <Text strong>{getAdminRequestTypeLabel(selectedReq.type)}</Text>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <Text type="secondary">Tiêu đề:</Text>{' '}
                            <Text strong>{selectedReq.title}</Text>
                        </div>
                        <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6, minHeight: 80, marginBottom: 16 }}>
                            <Text>{selectedReq.content}</Text>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <Text type="secondary">Ảnh đính kèm:</Text>{' '}
                            {selectedReq.attachments && selectedReq.attachments.length > 0 ? (
                                <Space>
                                    {selectedReq.attachments.map((url, i) => (
                                        <img key={i} src={url} alt={`attachment-${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
                                    ))}
                                </Space>
                            ) : (
                                <Text type="secondary" italic>Không có</Text>
                            )}
                        </div>

                        <Row justify="end" gutter={10}>
                            <Col>
                                <Button className="fix-height-32" onClick={() => setDetailModalOpen(false)}>Đóng</Button>
                            </Col>
                            {(selectedReq.status === 'PENDING' || selectedReq.status === 'IN_PROGRESS') && (
                                <Col>
                                    <Button className="fix-height-32" danger loading={actionLoading} onClick={handleRejectPrompt}>Từ chối</Button>
                                </Col>
                            )}
                            {selectedReq.status === 'PENDING' && (
                                <Col>
                                    <Button className="fix-height-32" type="primary" loading={actionLoading} onClick={handleAccept}>Nhận xử lý</Button>
                                </Col>
                            )}
                            {selectedReq.status === 'IN_PROGRESS' && (
                                <Col>
                                    <Button className="fix-height-32" type="primary" loading={actionLoading} onClick={handleComplete}>Hoàn thành</Button>
                                </Col>
                            )}
                        </Row>
                    </div>
                )}
            </Modal>

            <Modal
                title="Từ chối yêu cầu"
                open={rejectModalOpen}
                onCancel={() => setRejectModalOpen(false)}
                onOk={() => void submitReject()}
                confirmLoading={rejectLoading}
                okText="Xác nhận từ chối"
                okButtonProps={{ danger: true, className: 'fix-height-32' }}
                cancelButtonProps={{ className: 'fix-height-32' }}
                destroyOnClose
            >
                <Form form={rejectForm} layout="vertical">
                    <Form.Item
                        name="reason"
                        label="Lý do từ chối"
                        rules={[{ required: true, message: 'Bắt buộc phải nhập lý do từ chối!' }]}
                    >
                        <Input.TextArea rows={4} placeholder="Nhập lý do chi tiết..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}

export default RequestManagement
