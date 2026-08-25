import { useState, useEffect, useCallback } from 'react';
import { X, Film } from 'lucide-react';
import { fetchTitleDetail } from '../services/tmdb.js';
import { fetchRatings } from '../services/omdb.js';
import PLATFORMS from '../constants/platforms.js';

export default function ContentDetailModal({ item, onClose }) {
  const [detail, setDetail] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setFetching(true);
      setDetail(null);
      setRatings(null);
      const d = await fetchTitleDetail(item.tmdbId, item.type);
      if (cancelled) return;
      setDetail(d);
      const r = await fetchRatings(d.imdbId);
      if (cancelled) return;
      setRatings(r);
      setFetching(false);
    }
    load();
    return () => { cancelled = true; };
  }, [item.tmdbId, item.type]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );

  const platform = PLATFORMS.find((p) => p.id === item.platformId);
  const posterUrl = detail?.posterUrl || item.posterUrl;

  const hasImdb = ratings?.imdbRating && ratings.imdbRating !== 'N/A';
  const hasRt = ratings?.rtScore && ratings.rtScore !== 'N/A';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative bg-gray-900 w-full max-w-3xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col sm:flex-row shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X size={16} />
        </button>

        {/* Poster column */}
        <div className="w-full h-48 sm:h-auto sm:w-64 flex-shrink-0 bg-gray-800">
          {posterUrl ? (
            <img src={posterUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700">
              <Film size={48} />
            </div>
          )}
        </div>

        {/* Details column */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Title + badges */}
          <div className="space-y-2 pr-6">
            <h2 className="text-white font-bold text-2xl leading-tight">{item.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {item.year && (
                <span className="text-gray-400 text-sm">{item.year}</span>
              )}
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                  item.type === 'movie'
                    ? 'bg-blue-950 text-blue-300'
                    : 'bg-emerald-950 text-emerald-300'
                }`}
              >
                {item.type === 'movie' ? 'Movie' : 'Series'}
              </span>
              {platform && platform.id !== 'all' && (
                <span
                  className="text-white text-xs font-semibold px-3 py-0.5 rounded-full"
                  style={{ backgroundColor: platform.color || '#334155' }}
                >
                  {platform.label}
                </span>
              )}
            </div>
          </div>

          {fetching ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-1/2" />
              <div className="h-4 bg-gray-800 rounded w-full" />
              <div className="h-4 bg-gray-800 rounded w-5/6" />
              <div className="h-4 bg-gray-800 rounded w-4/6" />
            </div>
          ) : (
            <>
              {/* Ratings */}
              <div className="flex gap-3">
                <div className={`flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2.5 ${!hasImdb ? 'opacity-50' : ''}`}>
                  <span className="text-yellow-400 text-lg leading-none">★</span>
                  <div>
                    <p className="text-white font-bold text-base leading-none">
                      {hasImdb ? ratings.imdbRating : 'N/A'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">IMDb</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2.5 ${!hasRt ? 'opacity-50' : ''}`}>
                  <span className="text-base leading-none">🍅</span>
                  <div>
                    <p className={`font-bold text-base leading-none ${hasRt ? 'text-red-400' : 'text-white'}`}>
                      {hasRt ? ratings.rtScore : 'N/A'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">Rotten Tomatoes</p>
                  </div>
                </div>
              </div>

              {/* Genre chips */}
              {detail?.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detail.genres.map((g) => (
                    <span
                      key={g}
                      className="text-gray-300 text-xs bg-gray-800 border border-gray-700 px-3 py-1 rounded-full"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              {detail?.synopsis && (
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Synopsis</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{detail.synopsis}</p>
                </div>
              )}

              {/* Cast */}
              {detail?.cast?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Cast</p>
                  <p className="text-gray-300 text-sm">{detail.cast.join(', ')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
