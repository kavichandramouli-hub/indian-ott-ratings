const OPTIONS = [
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Series' },
  { value: 'both', label: 'Both' },
];

export default function TypeToggle({ selectedType, onTypeChange }) {
  return (
    <div className="flex bg-gray-800 rounded-full p-0.5 sm:p-1 gap-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onTypeChange(opt.value)}
          className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-800 ${
            selectedType === opt.value
              ? 'bg-white text-black shadow'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
