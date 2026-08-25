import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import ContentCard from './ContentCard.jsx';
import SkeletonCard from './SkeletonCard.jsx';

export default function ContentGrid({
  items,
  ratingsMap,
  loading,
  loadingMore,
  hasMore,
  selectedPlatform,
  onCardClick,
  onLoadMore,
  onReset,
}) {
  const [visible, setVisible] = useState(true);
  const prevItemsRef = useRef(items);

  useEffect(() => {
    if (items === prevItemsRef.current) return;
    if (prevItemsRef.current.length === 0 && items.length > 0) {
      prevItemsRef.current = items;
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
    prevItemsRef.current = items;
  }, [items]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 p-4 sm:p-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center gap-4">
        <p className="text-gray-400 text-base">No titles found. Try adjusting your filters.</p>
        {onReset && (
          <button
            onClick={onReset}
            className="text-sm text-white bg-gray-800 hover:bg-gray-700 px-5 py-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            Reset filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 p-4 sm:p-6 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {items.map((item, i) => (
          <ContentCard
            key={item.tmdbId}
            item={item}
            ratings={item.imdbId ? ratingsMap[item.imdbId] : undefined}
            index={i}
            selectedPlatform={selectedPlatform}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pb-8">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-8 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Loading more titles...
              </>
            ) : (
              'Load more titles'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
