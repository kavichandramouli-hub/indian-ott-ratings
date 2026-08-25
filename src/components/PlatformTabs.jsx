import PLATFORMS from '../constants/platforms.js';

export default function PlatformTabs({ selectedPlatform, onPlatformChange }) {
  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {PLATFORMS.map((p) => {
        const isActive = selectedPlatform === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onPlatformChange(p.id)}
            className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
              isActive
                ? 'text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            style={isActive ? { backgroundColor: p.color || '#3b82f6' } : {}}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
