import React from 'react'
import { Button } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { getSlidingPages, PAGE_SIZE } from '../utils/pagination'
import '../styles/sliding-pagination.css'

type SlidingPaginationFooterProps = {
  total: number
  currentPage: number
  onPageChange: (page: number) => void
  totalLabel: string
}

const SlidingPaginationFooter: React.FC<SlidingPaginationFooterProps> = ({
  total,
  currentPage,
  onPageChange,
  totalLabel,
}) => {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const pages = getSlidingPages(currentPage, totalPages, 5)

  return (
    <div className="table-pagination-footer">
      <div className="table-pagination-summary">{totalLabel}</div>

      <div className="table-pagination-controls">
        <div className="table-pagination-pages">
          <Button
            size="small"
            className="table-pagination-nav"
            icon={<LeftOutlined />}
            disabled={currentPage <= 1 || totalPages === 0}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          />

          {pages.map((page) => (
            <Button
              key={page}
              size="small"
              className={`table-pagination-page-btn${page === currentPage ? ' active' : ''}`}
              type={page === currentPage ? 'primary' : 'default'}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ))}

          <Button
            size="small"
            className="table-pagination-nav"
            icon={<RightOutlined />}
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          />
        </div>
      </div>
    </div>
  )
}

export default SlidingPaginationFooter