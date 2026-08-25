export default function Header({ searchQuery, onSearchChange }) {
  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl leading-none">🎬</span>
          <span className="text-white font-bold text-base sm:text-lg tracking-tight hidden xs:inline">Indian OTT Ratings</span>
          <span className="text-white font-bold text-base tracking-tight xs:hidden">OTT Ratings</span>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search titles..."
          className="w-36 sm:w-64 bg-gray-800 text-white text-sm placeholder-gray-500 rounded-full px-3 sm:px-4 py-2 border border-gray-700 focus:outline-none focus:border-gray-500 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 transition-colors"
        />
      </div>
    </header>
  );
}
