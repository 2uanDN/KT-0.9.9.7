import { useState, useMemo, useEffect } from 'react';

const PAGE_SIZE = 10; // P2-C Pagination page size

export function usePaginatedItems<T>(
  items: T[],
  resetKey?: unknown,
  pageSize: number = PAGE_SIZE
) {
  const [visibleCount, setVisibleCount] = useState<number>(pageSize);

  // Reset pagination when resetKey changes (if provided) or when items array changes
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [resetKey !== undefined ? resetKey : items, pageSize]);

  const paginatedItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  const hasMore = visibleCount < items.length;

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
  };

  const resetPagination = () => {
    setVisibleCount(pageSize);
  };

  return {
    items: paginatedItems,
    hasMore,
    loadMore,
    totalCount: items.length,
    visibleCount: Math.min(visibleCount, items.length),
    resetPagination,
  };
}

