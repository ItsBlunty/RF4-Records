import { useState, useEffect, useCallback, useMemo } from 'react';

const useWindowScroll = (allData, initialCount = 50, increment = 25) => {
  const [displayCount, setDisplayCount] = useState(initialCount);

  // Get visible data
  const visibleData = useMemo(() => {
    return allData.slice(0, displayCount);
  }, [allData, displayCount]);

  // Check if there's more data
  const hasMore = useMemo(() => {
    return displayCount < allData.length;
  }, [displayCount, allData.length]);

  // Load more data
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount(prev => Math.min(prev + increment, allData.length));
    }
  }, [hasMore, increment, allData.length]);

  // Reset when data changes (new filter/sort)
  useEffect(() => {
    setDisplayCount(initialCount);
  }, [allData.length, initialCount]);

  // Window scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Load more when within 300px of bottom
      if (scrollTop + windowHeight >= documentHeight - 300) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadMore]);

  return {
    visibleData,
    hasMore,
    displayCount,
    totalCount: allData.length
  };
};

export default useWindowScroll; 