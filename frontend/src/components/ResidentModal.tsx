import React from 'react'
import { Modal, Form, Input, Select, Row, Col } from 'antd'
import { normalizeResident } from '../utils/resident'

const { Option } = Select

const toInputDate = (value?: string | null) => {
  if (!value) return undefined
  if (value.includes('T')) return value.split('T')[0]
  return value
}

const normalizeGender = (gender?: string | null) => {
  const value = (gender || '').toUpperCase().trim()
  if (value === 'M') return 'MALE'
  if (value === 'F') return 'FEMALE'
  if (value === 'MALE' || value === 'FEMALE' || value === 'OTHER') return value
  return 'OTHER'
}

const normalizeRelationship = (relationship?: string | null) => {
  const value = (relationship || '').toUpperCase().trim()
  if (value === 'CHU_HO') return 'HEAD'
  if (value === 'VO_CHONG') return 'SPOUSE'
  if (value === 'CON') return 'CHILD'
  if (value === 'CHA_ME') return 'PARENT'
  if (value === 'NGUOI_THAN') return 'OTHER'
  if (value === 'HEAD' || value === 'SPOUSE' || value === 'CHILD' || value === 'PARENT' || value === 'OTHER') return value
  return 'OTHER'
}

const sanitizeField = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') return undefined
  return trimmed
}

const ResidentModal: React.FC<any> = ({ visible, onCancel, onSave, initial, householdId, loading }) => {
  const [form] = Form.useForm()

  React.useEffect(() => {
    form.resetFields()
    if (initial) {
      const resident = normalizeResident(initial)
      form.setFieldsValue({
        ...resident,
        dob: toInputDate(resident.dob),
        gender: normalizeGender(resident.gender),
        relationship: normalizeRelationship(resident.relationship),
        cccd: sanitizeField(resident.cccd),
        phone: sanitizeField(resident.phone),
        householdId: householdId ?? resident.householdId ?? null,
      })
      return
    }

    form.setFieldsValue({
      householdId: householdId ?? null,
      gender: 'OTHER',
      relationship: 'OTHER',
    })
  }, [initial, form, visible, householdId])

  const handleOk = async () => {
    const values = await form.validateFields()
    await onSave(values)
  }

  return (
    <Modal forceRender open={visible} confirmLoading={loading} onCancel={onCancel} onOk={handleOk} title={initial ? 'Chỉnh sửa cư dân' : 'Thêm cư dân'} okText={initial ? 'Lưu thay đổi' : 'Thêm cư dân'} cancelText="Hủy">
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}><Input placeholder="Nhập họ tên cư dân" /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="gender" label="Giới tính" rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}>
              <Select>
                <Option value="MALE">Nam</Option>
                <Option value="FEMALE">Nữ</Option>
                <Option value="OTHER">Khác</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="dob" label="Ngày sinh" rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}>
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="relationship" label="Vai trò trong hộ" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
              <Select>
                <Option value="HEAD">Chủ hộ</Option>
                <Option value="SPOUSE">Vợ / Chồng</Option>
                <Option value="CHILD">Con</Option>
                <Option value="PARENT">Cha / Mẹ</Option>
                <Option value="OTHER">Khác</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="cccd" label="CCCD"><Input placeholder="Nhập số CCCD" /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Số điện thoại"><Input placeholder="Nhập số điện thoại" /></Form.Item>
          </Col>
        </Row>

        <Form.Item name="householdId" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ResidentModal
