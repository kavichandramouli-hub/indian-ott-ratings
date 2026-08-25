import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import GENRES from '../constants/genres.js';

export default function GenreDropdown({ selectedGenres, onGenresChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function toggle(id) {
    if (selectedGenres.includes(id)) {
      onGenresChange(selectedGenres.filter((g) => g !== id));
    } else {
      onGenresChange([...selectedGenres, id]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-gray-800 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-full border border-gray-700 hover:border-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      >
        Genres
        {selectedGenres.length > 0 && (
          <span className="bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
            {selectedGenres.length}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {GENRES.map((g) => {
              const checked = selectedGenres.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggle(g.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:bg-gray-800 focus-visible:text-white"
                >
                  {g.name}
                  {checked && <Check size={13} className="text-white flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {selectedGenres.length > 0 && (
            <div className="border-t border-gray-800 p-2">
              <button
                onClick={() => { onGenresChange([]); setOpen(false); }}
                className="w-full text-xs text-gray-500 hover:text-white py-1.5 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
