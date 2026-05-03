import { useState } from 'react'
import { Alert, Card, Tabs } from 'antd'
import type { TabsProps } from 'antd'
import CreateRequest from './CreateRequest'
import RequestHistory from './RequestHistory'
import { useUserRequests } from '../../../hooks/useUserRequests'
import '../../../styles/resident-dashboard.css'
import '../../../styles/profile-household-page.css'
import '../../../styles/support-page.css'

const SupportPage = () => {
  const req = useUserRequests({ pageSize: 5 })
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('history')

  const handleCreated = async () => {
    setActiveTab('history')
    await req.reloadAfterCreate()
  }

  const tabItems: TabsProps['items'] = [
    {
      key: 'create',
      label: 'Tạo yêu cầu',
      children: <CreateRequest onSuccess={handleCreated} />,
    },
    {
      key: 'history',
      label: 'Lịch sử yêu cầu',
      children: (
        <RequestHistory
          items={req.items}
          loading={req.loading}
          stats={req.stats}
          statsLoading={req.statsLoading}
          currentPage={req.currentPage}
          setCurrentPage={req.setCurrentPage}
          totalPages={req.totalPages}
          totalElements={req.totalElements}
          pageSize={req.pageSize}
          refreshAll={req.refreshAll}
          onCreateNew={() => setActiveTab('create')}
        />
      ),
    },
  ]

  return (
    <div className="resident-page profile-household-page support-page">
      <header className="ph-page-intro">
        <h1 className="ph-page-intro__title">Yêu cầu và hỗ trợ</h1>
        <p className="ph-page-intro__sub">Gửi yêu cầu tới ban quản lý và theo dõi trạng thái xử lý.</p>
      </header>

      {req.error && <Alert type="warning" showIcon message={req.error} className="profile-household__alert" />}

      <div className="ph-page-stack">
        <Card className="resident-dashboard__card resident-settings-card">
          <Tabs
            className="resident-settings-tabs"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'create' | 'history')}
            items={tabItems}
            destroyOnHidden
          />
        </Card>
      </div>
    </div>
  )
}

export default SupportPage
