import React, { useState, useEffect } from 'react'
import { message, Button, Typography, Space, Modal } from 'antd'
import { SyncOutlined, PlusOutlined } from '@ant-design/icons'
import AccountStats from '../../components/AccountStats'
import AccountFilter from '../../components/AccountFilter'
import type { AccountFilterValues } from '../../components/AccountFilter'
import AccountTable from '../../components/AccountTable'
import AccountFormModal from '../../components/AccountFormModal'
import AssignApartmentModal from '../../components/AssignApartmentModal'
import ChangeApartmentModal from '../../components/ChangeApartmentModal'
import { accountApi } from '../../utils/account'
import type { AccountItem, AccountStats as StatsType, AccountUpsertRequest } from '../../utils/account'
import { extractApiError } from '../../utils/api'
import '../../styles/account-management.css'

const { Title, Text } = Typography

const AccountManagement: React.FC = () => {
  const [data, setData] = useState<AccountItem[]>([])
  const [stats, setStats] = useState<StatsType | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState<AccountFilterValues>({ search: '', role: 'ALL', status: 'ALL' })

  const [modalVisible, setModalVisible] = useState(false)
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [changeModalVisible, setChangeModalVisible] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null)
  const [assigningAccount, setAssigningAccount] = useState<AccountItem | null>(null)
  const [changingAccount, setChangingAccount] = useState<AccountItem | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  const fetchData = async (page = 1, currentFilters = filters) => {
    setLoading(true)
    try {
      const response = await accountApi.getAccounts(
        page,
        pagination.pageSize,
        currentFilters.search,
        currentFilters.role,
        currentFilters.status
      )
      const result = response.data
      setData(result.items || [])
      setStats(result.stats)
      setPagination({
        current: result.page,
        pageSize: result.size,
        total: result.totalItems,
      })
    } catch (error) {
      console.error('Lỗi khi tải danh sách tài khoản:', error)
      message.error('Không thể tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handlePageChange = (page: number) => {
    fetchData(page)
  }

  const handleFilter = (values: AccountFilterValues) => {
    setFilters(values)
    fetchData(1, values)
  }

  const handleClearFilter = () => {
    const defaultFilters = { search: '', role: 'ALL', status: 'ALL' }
    setFilters(defaultFilters)
    fetchData(1, defaultFilters)
  }

  const handleRefresh = () => {
    fetchData(pagination.current)
  }

  const handleAdd = () => {
    setEditingAccount(null)
    setModalVisible(true)
  }

  const handleEdit = (record: AccountItem) => {
    setEditingAccount(record)
    setModalVisible(true)
  }

  const handleAssign = (record: AccountItem) => {
    if (record.apartmentCode) {
      message.info('Tài khoản này đã có căn hộ, không thể gán lại.')
      return
    }
    setAssigningAccount(record)
    setAssignModalVisible(true)
  }

  const handleChangeApartment = (record: AccountItem) => {
    if (!record.apartmentCode) {
      message.info('Tài khoản này chưa có căn hộ để chuyển.')
      return
    }
    setChangingAccount(record)
    setChangeModalVisible(true)
  }

  const handleRemoveApartment = (record: AccountItem) => {
    if (!record.apartmentCode) {
      message.info('Tài khoản này chưa có căn hộ để rời.')
      return
    }

    Modal.confirm({
      title: 'Xác nhận rời căn hộ',
      content: `Bạn có chắc muốn cho tài khoản này rời căn hộ ${record.apartmentCode}?`,
      okText: 'Xác nhận',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await accountApi.removeApartment(record.id)
          message.success('Đã cập nhật rời căn hộ')
          fetchData(pagination.current)
        } catch (error: any) {
          console.error('Lỗi khi rời căn hộ:', error)
          message.error(extractApiError(error, 'Không thể rời căn hộ'))
        }
      },
    })
  }

  const handleDelete = async (id: number) => {
    try {
      await accountApi.deleteAccount(id)
      message.success('Xóa tài khoản thành công')
      fetchData(pagination.current)
    } catch (error: any) {
      console.error('Lỗi khi xóa tài khoản:', error)
      message.error(extractApiError(error, 'Không thể xóa tài khoản'))
    }
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    const applyStatusChange = async () => {
      const newStatus = checked ? 'ACTIVE' : 'DISABLED'
      await accountApi.updateStatus(id, checked)
      setData((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)))
      message.success(`Đã ${checked ? 'mở khóa' : 'vô hiệu hóa'} tài khoản`)
    }

    try {
      if (!checked) {
        await new Promise<void>((resolve, reject) => {
          Modal.confirm({
            title: 'Xác nhận vô hiệu hóa tài khoản',
            content: 'Tài khoản này sẽ không thể đăng nhập cho đến khi được kích hoạt lại.',
            okText: 'Vô hiệu hóa',
            okButtonProps: { danger: true },
            cancelText: 'Hủy',
            onOk: async () => {
              try {
                await applyStatusChange()
                resolve()
              } catch (error) {
                reject(error)
              }
            },
            onCancel: () => resolve(),
          })
        })
        return
      }

      await applyStatusChange()
    } catch (error: any) {
      console.error('Lỗi khi cập nhật trạng thái:', error)
      message.error(extractApiError(error, 'Không thể cập nhật trạng thái'))
    }
  }

  const handleSubmit = async (values: AccountUpsertRequest) => {
    setSubmitLoading(true)
    try {
      if (editingAccount) {
        await accountApi.updateAccount(editingAccount.id, values)
        message.success('Cập nhật tài khoản thành công')
      } else {
        await accountApi.createAccount(values)
        message.success('Thêm tài khoản thành công')
      }
      setModalVisible(false)
      fetchData(pagination.current)
    } catch (error: any) {
      console.error('Lỗi khi lưu tài khoản:', error)
      message.error(extractApiError(error, 'Có lỗi xảy ra khi lưu tài khoản'))
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f1f1f' }}>Quản lý tài khoản</Title>
          <Text type="secondary">Theo dõi và quản trị người dùng toàn hệ thống</Text>
        </div>
        <Space>
          <Button icon={<SyncOutlined />} onClick={handleRefresh}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm tài khoản
          </Button>
        </Space>
      </div>

      <AccountStats stats={stats} />

      <AccountFilter
        onFilter={handleFilter}
        onClear={handleClearFilter}
        loading={loading}
      />

      <AccountTable
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onAssign={handleAssign}
        onChangeApartment={handleChangeApartment}
        onRemoveApartment={handleRemoveApartment}
      />

      <AccountFormModal
        open={modalVisible}
        initialData={editingAccount}
        onCancel={() => setModalVisible(false)}
        onSuccess={() => fetchData(pagination.current)}
        loading={submitLoading}
        onSubmit={handleSubmit}
      />

      <AssignApartmentModal
        open={assignModalVisible}
        account={assigningAccount}
        onCancel={() => setAssignModalVisible(false)}
        onSuccess={() => {
          setAssignModalVisible(false)
          fetchData(pagination.current)
        }}
      />

      <ChangeApartmentModal
        open={changeModalVisible}
        account={changingAccount}
        onCancel={() => setChangeModalVisible(false)}
        onSuccess={() => {
          setChangeModalVisible(false)
          fetchData(pagination.current)
        }}
      />
    </div>
  )
}

export default AccountManagement
