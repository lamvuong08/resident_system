export const PAGE_SIZE = 20

export const getSlidingPages = (currentPage: number, totalPages: number, windowSize = 5) => {
  if (totalPages <= 0) {
    return [] as number[]
  }

  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const halfWindow = Math.floor(windowSize / 2)
  let startPage = Math.max(1, currentPage - halfWindow)
  let endPage = startPage + windowSize - 1

  if (endPage > totalPages) {
    endPage = totalPages
    startPage = Math.max(1, endPage - windowSize + 1)
  }

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)
}