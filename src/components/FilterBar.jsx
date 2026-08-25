import PlatformTabs from './PlatformTabs.jsx';
import TypeToggle from './TypeToggle.jsx';
import GenreDropdown from './GenreDropdown.jsx';

export default function FilterBar({
  selectedPlatform,
  onPlatformChange,
  selectedType,
  onTypeChange,
  selectedGenres,
  onGenresChange,
  resultCount,
}) {
  return (
    <div className="sticky top-14 sm:top-16 z-40 bg-gray-950 border-b border-gray-800 py-2 sm:py-3 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-2 sm:space-y-3">
        <PlatformTabs selectedPlatform={selectedPlatform} onPlatformChange={onPlatformChange} />
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <TypeToggle selectedType={selectedType} onTypeChange={onTypeChange} />
          <GenreDropdown selectedGenres={selectedGenres} onGenresChange={onGenresChange} />
          {resultCount !== undefined && (
            <span className="text-gray-500 text-sm ml-auto">
              {resultCount} title{resultCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
