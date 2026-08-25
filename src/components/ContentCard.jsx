import { Film } from 'lucide-react';
import PLATFORMS from '../constants/platforms.js';

function RatingRow({ ratings }) {
  if (ratings === undefined) {
    return (
      <div className="flex items-center gap-2 text-xs mt-1">
        <span className="inline-block w-16 h-3 bg-gray-800 rounded animate-pulse" />
        <span className="inline-block w-12 h-3 bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  const imdb = ratings?.imdbRating;
  const rt = ratings?.rtScore;
  const hasImdb = imdb && imdb !== 'N/A';
  const hasRt = rt && rt !== 'N/A';

  return (
    <div className="flex items-center gap-3 text-xs mt-1">
      <span className="flex items-center gap-1">
        <span className="text-yellow-500">★</span>
        <span className={hasImdb ? 'text-white font-medium' : 'text-gray-600'}>
          {hasImdb ? imdb : 'N/A'}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span>🍅</span>
        <span className={hasRt ? 'text-red-400 font-medium' : 'text-gray-600'}>
          {hasRt ? rt : 'N/A'}
        </span>
      </span>
    </div>
  );
}

export default function ContentCard({ item, ratings, index, selectedPlatform, onCardClick }) {
  const availablePlatformIds = Array.isArray(item.platformIds) && item.platformIds.length
    ? item.platformIds
    : (item.platformId ? [item.platformId] : []);

  const showStack = !selectedPlatform || selectedPlatform === 'all';
  const badgePlatforms = showStack
    ? PLATFORMS.filter((p) => p.id !== 'all' && availablePlatformIds.includes(p.id))
    : PLATFORMS.filter((p) => p.id === selectedPlatform);

  return (
    <article
      onClick={() => onCardClick(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick(item); }}
      tabIndex={0}
      className="bg-gray-900 rounded-xl overflow-hidden cursor-pointer group relative flex flex-col transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
    >
      <div className="relative aspect-[2/3] bg-gray-800 overflow-hidden flex-shrink-0">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            <Film size={40} />
          </div>
        )}

        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 flex flex-col justify-end">
          <p className="text-gray-200 text-xs leading-relaxed line-clamp-3">{item.synopsis}</p>
        </div>

        {badgePlatforms.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-row-reverse items-center gap-1">
            {badgePlatforms.map((p) => (
              <div
                key={p.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ring-1 ring-black/30"
                style={{ backgroundColor: p.color || '#334155' }}
                title={p.label}
              >
                {p.label[0]}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h2 className="text-white font-semibold text-sm leading-snug truncate">{item.title}</h2>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 text-xs">{item.year}</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${
              item.type === 'movie'
                ? 'bg-blue-950 text-blue-300'
                : 'bg-emerald-950 text-emerald-300'
            }`}
          >
            {item.type === 'movie' ? 'Movie' : 'Series'}
          </span>
        </div>

        <RatingRow ratings={ratings} />
      </div>
    </article>
  );
}
