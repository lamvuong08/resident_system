import { useCallback, useEffect, useState } from 'react'
import type { UserRequestRow, UserRequestStats } from '../types/userSupport'
import { extractApiError } from '../utils/api'
import {
  fetchUserRequestPage,
  fetchUserRequestStats,
} from '../utils/userSupportApi'

type UseUserRequestsOptions = {
  pageSize?: number
}

export function useUserRequests(options: UseUserRequestsOptions = {}) {
  const pageSize = options.pageSize ?? 5

  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<UserRequestRow[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState<UserRequestStats>({
    total: 0,
    done: 0,
    processing: 0,
    rejected: 0,
  })

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await fetchUserRequestStats()
      setStats(data)
    } catch {
      setStats({ total: 0, done: 0, processing: 0, rejected: 0 })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchPage = useCallback(
    async (page: number) => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchUserRequestPage(page - 1, pageSize)
        setItems(result.items)
        setTotalPages(result.totalPages)
        setTotalElements(result.totalElements)
      } catch (err) {
        setError(extractApiError(err, 'Không thể tải danh sách yêu cầu.'))
        setItems([])
        setTotalPages(0)
        setTotalElements(0)
      } finally {
        setLoading(false)
      }
    },
    [pageSize]
  )

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  useEffect(() => {
    void fetchPage(currentPage)
  }, [currentPage, fetchPage])

  /** Sau khi tạo yêu cầu mới: cập nhật thống kê và tải lại trang đầu */
  const reloadAfterCreate = useCallback(async () => {
    await loadStats()
    await fetchPage(1)
    setCurrentPage(1)
  }, [loadStats, fetchPage])

  const refreshAll = useCallback(async () => {
    await loadStats()
    await fetchPage(currentPage)
  }, [loadStats, fetchPage, currentPage])

  return {
    items,
    loading,
    error,
    stats,
    statsLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    totalElements,
    pageSize,
    refreshAll,
    reloadAfterCreate,
    loadStats,
    fetchPage,
  }
}
