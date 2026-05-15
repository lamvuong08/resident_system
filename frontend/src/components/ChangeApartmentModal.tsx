import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Form, Input, Modal, Select, Tag, Typography, message } from 'antd'
import type { AccountItem } from '../utils/account'
import { accountApi } from '../utils/account'
import api from '../utils/api'

interface ChangeApartmentModalProps {
    open: boolean
    account: AccountItem | null
    onCancel: () => void
    onSuccess: () => void
}

const ChangeApartmentModal: React.FC<ChangeApartmentModalProps> = ({ open, account, onCancel, onSuccess }) => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [apartments, setApartments] = useState<any[]>([])
    const [fetchingApartments, setFetchingApartments] = useState(false)

    const hasApartment = Boolean(account?.apartmentCode)
    const currentApartmentCode = account?.apartmentCode || ''
    const noAvailableApartments = hasApartment && !fetchingApartments && apartments.length === 0

    const selectedApartmentId = Form.useWatch('apartmentId', form)

    useEffect(() => {
        if (open) {
            form.resetFields()
            if (account?.apartmentCode) {
                fetchApartments()
            }
        }
    }, [open, account?.apartmentCode])

    const fetchApartments = async () => {
        setFetchingApartments(true)
        try {
            const response = await api.get('/apartments', {
                params: { available: true },
            })
            setApartments(Array.isArray(response.data) ? response.data : [])
        } catch (error) {
            console.error('Lỗi khi tải danh sách căn hộ:', error)
            message.error('Không thể tải danh sách căn hộ')
        } finally {
            setFetchingApartments(false)
        }
    }

    const selectedApartmentCode = useMemo(() => {
        const found = apartments.find((apt) => apt.id === selectedApartmentId)
        return found?.code ? String(found.code).toUpperCase() : ''
    }, [apartments, selectedApartmentId])

    const isSameApartment = Boolean(selectedApartmentCode && currentApartmentCode
        && selectedApartmentCode === String(currentApartmentCode).toUpperCase())

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields()
            if (!account) return

            if (isSameApartment) {
                message.error('Căn hộ mới trùng với căn hộ hiện tại')
                return
            }

            setLoading(true)
            await accountApi.changeApartment(account.id, {
                apartmentId: values.apartmentId,
                reason: values.reason,
            })
            message.success('Chuyển căn hộ thành công')
            onSuccess()
        } catch (error: any) {
            if (error && error.errorFields) return

            const errorMsg = error?.response?.data?.message || error?.response?.data || error?.message || 'Có lỗi xảy ra khi chuyển căn hộ'
            message.error(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            title={account ? `Chuyển căn hộ cho cư dân: ${account.fullName}` : 'Chuyển căn hộ'}
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            okText="Chuyển căn hộ"
            cancelText="Hủy"
            confirmLoading={loading}
            okButtonProps={{ disabled: !hasApartment || noAvailableApartments || isSameApartment }}
        >
            {!hasApartment ? (
                <Alert
                    type="warning"
                    showIcon
                    message="Tài khoản chưa có căn hộ"
                />
            ) : (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <Typography.Text strong>Căn hộ hiện tại: </Typography.Text>
                        <Typography.Text>{currentApartmentCode}</Typography.Text>
                        <Tag color="green" style={{ marginLeft: 8 }}>Đã có căn hộ</Tag>
                    </div>
                    {noAvailableApartments && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Không còn căn hộ trống"
                            style={{ marginBottom: 12 }}
                        />
                    )}
                    <Form form={form} layout="vertical">
                        <Form.Item
                            name="apartmentId"
                            label="Chọn căn hộ mới"
                            rules={[{ required: true, message: 'Vui lòng chọn căn hộ mới' }]}
                        >
                            <Select
                                showSearch
                                placeholder="Tìm kiếm và chọn căn hộ"
                                loading={fetchingApartments}
                                disabled={noAvailableApartments}
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                                options={apartments.map(apt => ({
                                    value: apt.id,
                                    label: `${apt.buildingCode ? apt.buildingCode + '-' : ''}${apt.code}`
                                }))}
                            />
                        </Form.Item>
                        <Form.Item
                            name="reason"
                            label="Lý do chuyển (tuỳ chọn)"
                        >
                            <Input.TextArea rows={3} placeholder="Nhập lý do chuyển căn hộ" />
                        </Form.Item>
                    </Form>
                </>
            )}
        </Modal>
    )
}

export default ChangeApartmentModal
