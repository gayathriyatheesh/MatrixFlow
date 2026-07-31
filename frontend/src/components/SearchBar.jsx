import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import api from '../services/api';

/**
 * Expandable search bar with live dropdown results.
 * Props:
 *   onSelectMovie(movie) — called when a result is clicked
 */
export default function SearchBar({ onSelectMovie }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Click-outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const searchMovies = useCallback(async (q) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/api/search', { params: { q } });
      setResults(res.data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Set a new 400ms debounce
    debounceRef.current = setTimeout(() => {
      searchMovies(value);
    }, 400);
  };

  const handleSelectMovie = (movie) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    if (onSelectMovie) onSelectMovie(movie);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  // Close on Escape
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') handleClose();
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* Search icon button */
          <motion.button
            key="search-icon"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            type="button"
            onClick={() => setIsOpen(true)}
            className="p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Search movies"
          >
            <Search size={16} />
          </motion.button>
        ) : (
          /* Expanded search input */
          <motion.div
            key="search-input"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="flex items-center bg-white/10 border border-white/20 rounded-full overflow-hidden backdrop-blur-md">
              <Search size={14} className="ml-3 text-neutral-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search movies..."
                className="w-full bg-transparent text-white text-xs font-sans-editorial px-2.5 py-2 outline-none placeholder:text-neutral-500"
              />
              {loading ? (
                <Loader2 size={14} className="mr-3 text-purple-400 animate-spin flex-shrink-0" />
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="mr-2 p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {(results.length > 0 || (query.length >= 3 && !loading)) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-[360px] overflow-y-auto"
                >
                  {results.length > 0 ? (
                    results.map((movie) => (
                      <button
                        key={movie.movie_id}
                        type="button"
                        onClick={() => handleSelectMovie(movie)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left cursor-pointer group"
                      >
                        {/* Poster thumbnail */}
                        <div className="w-9 h-[54px] flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                          {movie.poster_url && (
                            <img
                              src={movie.poster_url}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </div>
                        {/* Movie info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-sans-editorial font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                            {movie.title}
                          </p>
                          {movie.genres && movie.genres.length > 0 && (
                            <p className="text-[10px] font-sans-editorial text-neutral-500 truncate mt-0.5">
                              {movie.genres.slice(0, 3).join(' · ')}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs font-sans-editorial text-neutral-500">
                        No movies found for "{query}"
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
