import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Empty, Form, Grid, Image, Input, Modal, Select, Skeleton, Table, Tag, Upload, message } from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import type { ColumnsType } from 'antd/es/table'
import { CarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { VehicleRow } from '../../utils/vehicleApi'
import { createUserVehicle, fetchUserVehicles, getVehicleStatusLabel, getVehicleThumbnailUrl, getVehicleTypeLabel } from '../../utils/vehicleApi'
import { residentVehicleCounts, residentVehicleError, residentVehiclePhotoError, residentVehicleStatusColor, vehicleRegistrationDate } from '../../utils/residentVehiclePresentation'
import '../../styles/user-vehicle.css'

function VehicleStatus({ status }: { status: string }) {
  return <Tag color={residentVehicleStatusColor(status)} icon={status === 'ACTIVE' ? <CheckCircleOutlined /> : status === 'PENDING' ? <ClockCircleOutlined /> : status === 'REJECTED' ? <CloseCircleOutlined /> : undefined}>
    {getVehicleStatusLabel(status)}
  </Tag>
}

function VehicleThumbnail({ vehicle }: { vehicle: VehicleRow }) {
  const [failed, setFailed] = useState(false)
  const [preview, setPreview] = useState(false)
  const src = getVehicleThumbnailUrl(vehicle)
  if (!src || failed) return <span className="resident-vehicle-thumbnail resident-vehicle-placeholder" role="img" aria-label={`${failed ? 'Ảnh không khả dụng' : 'Chưa có ảnh'}: ${vehicle.licensePlate}`}><CarOutlined /></span>
  return <span className="resident-vehicle-thumbnail resident-vehicle-image-button" role="button" tabIndex={0}
    aria-label={`Xem ảnh phương tiện ${vehicle.licensePlate}`} onClick={event => { if (event.currentTarget.contains(event.target as Node)) setPreview(true) }}
    onKeyDown={event => { if (event.currentTarget.contains(event.target as Node) && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setPreview(true) } }}>
    <Image src={src} alt={`Phương tiện ${vehicle.licensePlate}`} width={52} height={52}
      onError={() => { setFailed(true); setPreview(false) }} preview={{ open: preview, onOpenChange: setPreview, mask: false }} />
  </span>
}

export function ResidentVehicleList({ vehicles, loading, error, onAdd, onReload }: {
  vehicles: VehicleRow[]; loading: boolean; error: string; onAdd: () => void; onReload: () => void
}) {
  const screens = Grid.useBreakpoint()
  const counts = residentVehicleCounts(vehicles)
  const columns: ColumnsType<VehicleRow> = [
    { title: 'Ảnh', key: 'image', width: 84, responsive: ['sm'], render: (_, row) => <VehicleThumbnail key={getVehicleThumbnailUrl(row)} vehicle={row} /> },
    { title: 'Biển số', dataIndex: 'licensePlate', key: 'plate', render: (value: string, row) => <div className="resident-vehicle-plate"><span className="resident-vehicle-mobile-thumbnail"><VehicleThumbnail key={getVehicleThumbnailUrl(row)} vehicle={row} /></span><strong>{value}</strong><span className="resident-vehicle-mobile-info">{getVehicleTypeLabel(row.type)}</span><span className="resident-vehicle-mobile-info">{vehicleRegistrationDate(row.createdAt)}</span></div> },
    { title: 'Loại phương tiện', dataIndex: 'type', key: 'type', width: 170, responsive: ['sm'], render: getVehicleTypeLabel },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 130, render: (status: string) => <VehicleStatus status={status} /> },
    { title: 'Ngày đăng ký', dataIndex: 'createdAt', key: 'registered', width: 190, responsive: ['sm'], render: (date: string) => <time dateTime={date}>{vehicleRegistrationDate(date)}</time> },
  ]
  return <div className="user-vehicle-page resident-vehicle-page">
    <header className="user-vehicle-header"><div className="user-vehicle-header-left"><h1>Phương tiện của tôi</h1><p>Quản lý các phương tiện đã đăng ký tại căn hộ của bạn.</p></div><Button type="primary" size="large" icon={<PlusOutlined />} onClick={onAdd}>Thêm phương tiện</Button></header>
    <section className="resident-vehicle-summary" aria-label="Thống kê phương tiện của căn hộ" aria-busy={loading}>
      {([
        { key: 'total', label: 'Tổng phương tiện', value: counts.total, icon: <CarOutlined /> },
        { key: 'approved', label: 'Đã duyệt', value: counts.approved, icon: <CheckCircleOutlined /> },
        { key: 'pending', label: 'Chờ duyệt', value: counts.pending, icon: <ClockCircleOutlined /> },
      ]).map(item => <Card key={item.key} className={`resident-vehicle-metric resident-vehicle-metric-${item.key}`}><span className="resident-vehicle-metric-icon" aria-hidden="true">{item.icon}</span><div><span className="resident-vehicle-muted">{item.label}</span>{loading ? <Skeleton.Input active size="small" /> : <strong>{error && !vehicles.length ? '—' : item.value}</strong>}</div></Card>)}
    </section>
    {error && <Alert className="resident-vehicle-error" type="error" showIcon title="Chưa tải được danh sách phương tiện" description={error} action={<Button onClick={onReload} loading={loading}>Thử lại</Button>} />}
    <Card className="user-vehicle-card">
      <div className="resident-vehicle-list-header"><div><h2>Danh sách phương tiện</h2><p className="resident-vehicle-muted">Theo dõi trạng thái xét duyệt của từng phương tiện.</p></div><Button icon={<ReloadOutlined />} onClick={onReload} loading={loading}>Làm mới</Button></div>
      <Table<VehicleRow> rowKey="id" loading={loading} columns={columns} dataSource={vehicles} size="middle" tableLayout="fixed"
        scroll={screens.sm ? { x: 720 } : undefined}
        pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false, responsive: true, showTotal: total => `${total} phương tiện` }}
        locale={{ emptyText: loading ? <span>Đang tải phương tiện…</span> : error ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Danh sách chưa tải được. Vui lòng thử lại." /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa đăng ký phương tiện nào."><Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Thêm phương tiện</Button></Empty> }} />
    </Card>
  </div>
}

export default function UserVehicle() {
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [listError, setListError] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm] = Form.useForm<{ licensePlate: string; type: string }>()
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null)
  const mounted = useRef(false)
  const requestId = useRef(0)
  const submitting = useRef(false)
  const localImageUrl = useRef<string | null>(null)

  const releaseLocalImage = useCallback(() => {
    if (localImageUrl.current) URL.revokeObjectURL(localImageUrl.current)
    localImageUrl.current = null
  }, [])
  const loadData = useCallback(async () => {
    const request = ++requestId.current
    try {
      const rows = await fetchUserVehicles()
      if (!mounted.current || request !== requestId.current) return
      setVehicles(rows)
      setListError('')
    } catch (error) {
      if (mounted.current && request === requestId.current) setListError(residentVehicleError(error, 'Không thể tải phương tiện. Vui lòng kiểm tra kết nối hoặc thử lại sau.'))
    } finally {
      if (mounted.current && request === requestId.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    void loadData()
    return () => { mounted.current = false; releaseLocalImage() }
  }, [loadData, releaseLocalImage])
  const reload = () => { setLoading(true); void loadData() }
  const openCreate = () => {
    createForm.resetFields(); releaseLocalImage(); setFileList([]); setCreateError(''); setPhotoError(''); setPreviewImage(null); setCreateModalOpen(true)
  }
  const closeCreate = () => {
    if (submitting.current) return
    setCreateModalOpen(false); setPreviewImage(null); releaseLocalImage(); setFileList([])
  }
  const handleUploadChange = ({ fileList: next }: { fileList: UploadFile[] }) => {
    const files = next.slice(-1)
    releaseLocalImage()
    const file = files[0]?.originFileObj
    if (file) { localImageUrl.current = URL.createObjectURL(file); files[0] = { ...files[0], thumbUrl: localImageUrl.current, url: localImageUrl.current } }
    setPreviewImage(null); setFileList(files); setPhotoError('')
  }
  const submitCreate = async () => {
    if (submitting.current) return
    submitting.current = true
    try {
      const values = await createForm.validateFields()
      const file = fileList[0]?.originFileObj
      if (!file) { setPhotoError('Vui lòng chọn ít nhất 1 ảnh xe.'); return }
      const imageError = residentVehiclePhotoError(file)
      if (imageError) { setPhotoError(imageError); return }
      setCreateError(''); setCreateLoading(true)
      await createUserVehicle({ licensePlate: values.licensePlate, type: values.type, file })
      if (!mounted.current) return
      message.success('Đã gửi yêu cầu đăng ký phương tiện. Vui lòng chờ ban quản lý xét duyệt.')
      setCreateModalOpen(false); setPreviewImage(null); releaseLocalImage(); setFileList([]); createForm.resetFields(); reload()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      if (mounted.current) setCreateError(residentVehicleError(error, 'Chưa thể gửi đăng ký. Vui lòng thử lại; thông tin bạn đã nhập vẫn được giữ lại.'))
    } finally {
      submitting.current = false
      if (mounted.current) setCreateLoading(false)
    }
  }
  return <>
    <ResidentVehicleList vehicles={vehicles} loading={loading} error={listError} onAdd={openCreate} onReload={reload} />
    <Modal rootClassName="resident-vehicle-create-modal" title="Đăng ký phương tiện" open={createModalOpen} onCancel={closeCreate}
      onOk={() => void submitCreate()} confirmLoading={createLoading} okText="Gửi đăng ký" cancelText="Hủy"
      cancelButtonProps={{ disabled: createLoading }} closable={!createLoading} keyboard={!createLoading} maskClosable={!createLoading} forceRender>
      <p className="resident-vehicle-form-intro">Điền thông tin và ảnh phương tiện. Đăng ký sẽ được gửi đến ban quản lý để xét duyệt.</p>
      {createError && <Alert className="resident-vehicle-form-error" type="error" showIcon title="Chưa thể đăng ký phương tiện" description={createError} />}
      <Form form={createForm} layout="vertical" disabled={createLoading} onFinish={() => void submitCreate()}>
        <Form.Item name="licensePlate" label="Biển số xe" rules={[{ required: true, message: 'Bắt buộc nhập biển số xe!' }, { min: 3, message: 'Biển số quá ngắn!' }]}><Input placeholder="Ví dụ: 29A-123.45" autoComplete="off" /></Form.Item>
        <Form.Item name="type" label="Loại phương tiện" rules={[{ required: true, message: 'Bắt buộc chọn loại phương tiện!' }]}><Select placeholder="Chọn loại phương tiện" options={[{ value: 'CAR', label: 'Ô tô' }, { value: 'MOTORBIKE', label: 'Xe máy' }, { value: 'BICYCLE', label: 'Xe đạp' }]} /></Form.Item>
        <Form.Item label="Ảnh phương tiện" required validateStatus={photoError ? 'error' : undefined} help={photoError || 'Chọn 1 ảnh JPG/PNG, tối đa 5MB. Có thể nhấn ảnh để xem trước.'}>
          <Upload accept="image/jpeg,image/png" listType="picture-card" fileList={fileList} maxCount={1} disabled={createLoading}
            beforeUpload={file => { const error = residentVehiclePhotoError(file); if (error) { setPhotoError(error); return Upload.LIST_IGNORE } return false }}
            onChange={handleUploadChange} onPreview={file => { if (file.url || file.thumbUrl) setPreviewImage({ src: file.url || file.thumbUrl || '', name: file.name }) }}>
            {!fileList.length && <span className="resident-vehicle-upload-button"><PlusOutlined /><span>Chọn ảnh xe</span></span>}
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
    <Modal rootClassName="resident-vehicle-image-modal" title="Ảnh phương tiện đã chọn" open={previewImage != null} onCancel={() => setPreviewImage(null)} footer={<Button onClick={() => setPreviewImage(null)}>Đóng</Button>}>
      {previewImage && <img src={previewImage.src} alt={previewImage.name} className="resident-vehicle-upload-preview" />}
    </Modal>
  </>
}
