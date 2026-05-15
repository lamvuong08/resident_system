import React, { useEffect, useState } from 'react'
import { Modal, Form, Select, message, Alert, Typography } from 'antd'
import type { AccountItem } from '../utils/account'
import { accountApi } from '../utils/account'
import api from '../utils/api'

interface AssignApartmentModalProps {
    open: boolean
    account: AccountItem | null
    onCancel: () => void
    onSuccess: () => void
}

const AssignApartmentModal: React.FC<AssignApartmentModalProps> = ({ open, account, onCancel, onSuccess }) => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [apartments, setApartments] = useState<any[]>([])
    const [fetchingApartments, setFetchingApartments] = useState(false)

    const hasApartment = Boolean(account?.apartmentCode)
    const apartmentLabel = account?.apartmentCode ? account.apartmentCode : ''
    const noAvailableApartments = !hasApartment && !fetchingApartments && apartments.length === 0

    useEffect(() => {
        if (open) {
            form.resetFields()
            if (!account?.apartmentCode) {
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

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields()
            if (!account) return

            setLoading(true)
            await accountApi.assignApartment(account.id, {
                apartmentId: values.apartmentId,
                relationship: values.relationship,
            })
            message.success('Gán căn hộ thành công')
            onSuccess()
        } catch (error: any) {
            if (error && error.errorFields) return

            const errorMsg = error?.response?.data?.message || error?.response?.data || error?.message || 'Có lỗi xảy ra khi gán căn hộ'
            message.error(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            title={account ? `Gán căn hộ cho cư dân: ${account.fullName}` : 'Gán căn hộ'}
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            okText="Gán căn hộ"
            cancelText="Hủy"
            confirmLoading={loading}
            okButtonProps={{ disabled: hasApartment || noAvailableApartments }}
        >
            {hasApartment ? (
                <Alert
                    type="success"
                    showIcon
                    message="Tài khoản đã có căn hộ"
                    description={
                        <Typography.Text>
                            Căn hộ hiện tại: <strong>{apartmentLabel}</strong>
                        </Typography.Text>
                    }
                />
            ) : (
                <Form form={form} layout="vertical">
                    {noAvailableApartments && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Không còn căn hộ trống"
                            style={{ marginBottom: 12 }}
                        />
                    )}
                    <Form.Item
                        name="apartmentId"
                        label="Chọn căn hộ"
                        rules={[{ required: true, message: 'Vui lòng chọn căn hộ' }]}
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
                        name="relationship"
                        label="Vai trò"
                        rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                    >
                        <Select placeholder="Chọn vai trò" disabled={noAvailableApartments}>
                            <Select.Option value="HEAD">Chủ hộ</Select.Option>
                            <Select.Option value="SPOUSE">Vợ / Chồng</Select.Option>
                            <Select.Option value="CHILD">Con</Select.Option>
                            <Select.Option value="PARENT">Cha / Mẹ</Select.Option>
                            <Select.Option value="OTHER">Thành viên khác / Người thuê</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            )}
        </Modal>
    )
}

export default AssignApartmentModal
