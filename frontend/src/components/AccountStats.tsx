import React from 'react'
import { Card, Col, Row, Statistic } from 'antd'
import { TeamOutlined, UserOutlined, CrownOutlined, ToolOutlined } from '@ant-design/icons'
import type { AccountStats as StatsType } from '../utils/account'

interface AccountStatsProps {
  stats: StatsType | null
}

const AccountStats: React.FC<AccountStatsProps> = ({ stats }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card variant="borderless" className="stat-card" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Tổng tài khoản"
              value={stats?.totalAccounts || 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card variant="borderless" className="stat-card" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Quản trị viên (Admin)"
              value={stats?.adminAccounts || 0}
              prefix={<CrownOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card variant="borderless" className="stat-card" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Nhân viên"
              value={stats?.staffAccounts || 0}
              prefix={<ToolOutlined style={{ color: '#722ed1' }} />}
              styles={{ content: { color: '#722ed1', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
          <Card variant="borderless" className="stat-card" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Cư dân"
              value={stats?.residentAccounts || 0}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AccountStats
