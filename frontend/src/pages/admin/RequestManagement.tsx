import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
    Button,
    Card,
    Col,
    Input,
    Modal,
    Row,
    Select,
    Table,
    Tabs,
    Tag,
    Typography,
    message,
    Form
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useLocation, useSearchParams } from 'react-router-dom'
import type { AdminRequestRow, AssignmentHistory } from '../../utils/adminSupportApi'
import {
    fetchAdminRequests,
    getAdminRequestDetail,
    setAdminRequestInProgress,
    setAdminRequestCompleted,
    setAdminRequestRejected,
    getAdminRequestTypeLabel,
    getAdminRequestStatusLabel,
    fetchAssignmentHistory,
    startAssignedRequest,
} from '../../utils/adminSupportApi'
import SlidingPaginationFooter from '../../components/SlidingPaginationFooter'
import { PAGE_SIZE } from '../../utils/pagination'
import { formatUserRequestDate } from '../../utils/userSupportApi'
import { extractApiError } from '../../utils/api'
import { getStoredRole } from '../../utils/authStorage'
import { useNotification } from '../../context/NotificationContext'
import RequestAssignmentModal from '../../components/RequestAssignmentModal'
import RequestDetailModal from '../../components/RequestDetailModal'

const { Text } = Typography

const RequestManagement: React.FC = () => {
    const isStaff = getStoredRole().includes('STAFF') && !getStoredRole().includes('ADMIN')
    const { requestUpdatesVersion } = useNotification()
    const [loading, setLoading] = useState(false)
    const [rows, setRows] = useState<AdminRequestRow[]>([])

    const [keyword, setKeyword] = useState('')
    const [activeTab, setActiveTab] = useState<string>(isStaff ? 'PENDING' : 'ALL')
    const [filterType, setFilterType] = useState<string>('ALL')

    const [currentPage, setCurrentPage] = useState(1)
    const [totalElements, setTotalElements] = useState(0)

    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedReq, setSelectedReq] = useState<AdminRequestRow | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const listRequestRef = useRef(0)
    const [assignmentRequest, setAssignmentRequest] = useState<AdminRequestRow | null>(null)
    const [assignmentOpen, setAssignmentOpen] = useState(false)
    const [transfer, setTransfer] = useState(false)
    const [history, setHistory] = useState<AssignmentHistory[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyError, setHistoryError] = useState(false)

    useEffect(() => {
        if (isStaff || !selectedReq?.id) return
        let active = true
        setHistoryLoading(true)
        setHistoryError(false)
        setHistory([])
        void fetchAssignmentHistory(selectedReq.id).then((rows) => { if (active) setHistory(rows) })
            .catch(() => { if (active) setHistoryError(true) })
            .finally(() => { if (active) setHistoryLoading(false) })
        return () => { active = false }
    }, [selectedReq?.id, requestUpdatesVersion, isStaff])

    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [rejectRequest, setRejectRequest] = useState<AdminRequestRow | null>(null)
    const [rejectForm] = Form.useForm()
    const [rejectLoading, setRejectLoading] = useState(false)

    const [actionLoading, setActionLoading] = useState(false)
    const mutationPendingRef = useRef(false)

    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()

    // Tự động mở modal xử lý yêu cầu khi nhận được requestId từ URL hoặc navigation state (nút "Xử lý ngay")
    useEffect(() => {
        const requestIdParam = searchParams.get('requestId') || location.state?.requestId
        if (!requestIdParam) {
            setDetailModalOpen(false)
            setSelectedReq(null)
            setDetailLoading(false)
            return
        }

        const targetId = Number(requestIdParam)
        if (!Number.isSafeInteger(targetId) || targetId <= 0) return

        let active = true
        setDetailModalOpen(true)
        setDetailLoading(true)
        setSelectedReq(null)
        setHistory([])

        // Always load permissions from the server, including after realtime invalidation.
        getAdminRequestDetail(targetId)
            .then((detail) => {
                if (active && detail) {
                    setSelectedReq(detail)
                    setDetailModalOpen(true)
                }
            })
            .catch((err) => {
                if (active) {
                    setSelectedReq(null)
                    setDetailModalOpen(false)
                    setRejectModalOpen(false)
                    setAssignmentOpen(false)
                    message.error(extractApiError(err, `Không thể tải thông tin yêu cầu #${targetId}`))
                }
            })
            .finally(() => { if (active) setDetailLoading(false) })
        return () => { active = false }
    }, [searchParams, location.state, requestUpdatesVersion])

    const handleCloseDetailModal = () => {
        setDetailModalOpen(false)
        setSelectedReq(null)
        setRejectModalOpen(false)
        setAssignmentOpen(false)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('requestId')
        setSearchParams(nextParams, { replace: true, state: null })
    }

    const loadData = useCallback(async () => {
        const requestNumber = ++listRequestRef.current
        setLoading(true)
        try {
            const res = await fetchAdminRequests({
                page: currentPage,
                size: PAGE_SIZE,
                status: activeTab,
                type: filterType,
                searchQuery: keyword
            })
            if (requestNumber === listRequestRef.current) {
                setRows(res.items)
                setTotalElements(res.totalElements)
            }
        } catch (err) {
            if (requestNumber === listRequestRef.current) message.error(extractApiError(err, 'Lỗi tải danh sách yêu cầu'))
        } finally {
            if (requestNumber === listRequestRef.current) setLoading(false)
        }
    }, [currentPage, activeTab, filterType, keyword])

    useEffect(() => {
        loadData()
        return () => { ++listRequestRef.current }
    }, [loadData, requestUpdatesVersion])

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
            case 'ASSIGNED': return 'blue'
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
            title: 'Người phụ trách',
            key: 'assignedStaff',
            width: 160,
            render: (_, row) => row.assignedStaff?.name || 'Chưa có người phụ trách',
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 100,
            align: 'center',
            render: (_, row: AdminRequestRow) => (
                <Button type="link" size="small" onClick={() => setSearchParams({ requestId: String(row.id) })}>Chi tiết</Button>
            ),
        },
    ]

    const handleAccept = async (request: AdminRequestRow) => {
        if ((!request.canAccept && !request.canStart) || mutationPendingRef.current) return
        mutationPendingRef.current = true
        setActionLoading(true)
        try {
            if (request.canStart) await startAssignedRequest(request.id)
            else await setAdminRequestInProgress(request.id)
            message.success(request.canStart ? 'Đã bắt đầu xử lý yêu cầu' : 'Đã nhận xử lý yêu cầu')
            handleCloseDetailModal()
            loadData()
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi cập nhật yêu cầu'))
            handleCloseDetailModal()
            void loadData()
        } finally {
            mutationPendingRef.current = false
            setActionLoading(false)
        }
    }

    const handleComplete = async (request: AdminRequestRow) => {
        if (!request.canComplete || mutationPendingRef.current) return
        mutationPendingRef.current = true
        setActionLoading(true)
        try {
            await setAdminRequestCompleted(request.id)
            message.success('Đã hoàn thành yêu cầu')
            handleCloseDetailModal()
            loadData()
        } catch (err) {
            message.error(extractApiError(err, 'Lỗi cập nhật yêu cầu'))
            handleCloseDetailModal()
            void loadData()
        } finally {
            mutationPendingRef.current = false
            setActionLoading(false)
        }
    }

    const handleRejectPrompt = (request: AdminRequestRow) => {
        if (!request.canReject) return
        setRejectRequest(request)
        rejectForm.resetFields()
        setRejectModalOpen(true)
    }

    const submitReject = async () => {
        if (!rejectRequest?.canReject || mutationPendingRef.current) return
        mutationPendingRef.current = true
        try {
            const values = await rejectForm.validateFields()
            setRejectLoading(true)
            await setAdminRequestRejected(rejectRequest.id, values.reason)
            message.success('Đã từ chối yêu cầu')
            setRejectModalOpen(false)
            handleCloseDetailModal()
            loadData()
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'errorFields' in err) return
            message.error(extractApiError(err, 'Lỗi cập nhật yêu cầu'))
            handleCloseDetailModal()
            void loadData()
        } finally {
            mutationPendingRef.current = false
            setRejectLoading(false)
        }
    }

    return (
        <div className="request-management-page">
            <Card className="request-filter-card" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
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

            <Card className="request-table-card" styles={{ body: { padding: '0 16px 16px' } }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={isStaff ? [
                        { key: 'PENDING', label: 'Chưa tiếp nhận' },
                        { key: 'MINE', label: 'Công việc của tôi' },
                        { key: 'COMPLETED', label: 'Đã hoàn thành' },
                        { key: 'REJECTED', label: 'Đã từ chối' },
                    ] : [
                        { key: 'ALL', label: 'Tất cả' },
                        { key: 'PENDING', label: 'Chờ xử lý' },
                        { key: 'ASSIGNED', label: 'Đã phân công' },
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
                    scroll={{ x: 'max-content' }}
                    pagination={false}
                />
                <SlidingPaginationFooter
                    total={totalElements}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    totalLabel={`Tổng ${totalElements} yêu cầu`}
                />
            </Card>

            <RequestDetailModal open={detailModalOpen} loading={detailLoading} request={selectedReq}
                history={isStaff ? [] : history} historyLoading={!isStaff && historyLoading}
                historyError={!isStaff && historyError} onClose={handleCloseDetailModal}
                actions={selectedReq && <>
                    {selectedReq.canReject && <Button className="fix-height-32" danger disabled={actionLoading || rejectLoading}
                        onClick={() => handleRejectPrompt(selectedReq)}>Từ chối</Button>}
                    {!isStaff && (selectedReq.canAssign || selectedReq.canReassign) && <Button className="fix-height-32"
                        disabled={actionLoading || rejectLoading} onClick={() => {
                            setAssignmentRequest(selectedReq)
                            setTransfer(Boolean(selectedReq.canReassign))
                            setAssignmentOpen(true)
                        }}>{selectedReq.canReassign ? 'Thay đổi nhân viên' : 'Phân công'}</Button>}
                    {(selectedReq.canAccept || selectedReq.canStart) && <Button className="fix-height-32" type="primary"
                        loading={actionLoading} disabled={rejectLoading} onClick={() => void handleAccept(selectedReq)}>
                        {selectedReq.canStart ? 'Bắt đầu xử lý' : 'Nhận xử lý'}
                    </Button>}
                    {selectedReq.canComplete && <Button className="fix-height-32" type="primary" loading={actionLoading}
                        disabled={rejectLoading} onClick={() => void handleComplete(selectedReq)}>Hoàn thành</Button>}
                </>}>

            {!isStaff && <RequestAssignmentModal open={assignmentOpen} request={assignmentRequest} transfer={transfer}
                revision={requestUpdatesVersion} onCancel={() => setAssignmentOpen(false)} onDone={() => {
                    setAssignmentOpen(false)
                    handleCloseDetailModal()
                    void loadData()
                }} />}

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
            </RequestDetailModal>
        </div>
    )
}

export default RequestManagement
