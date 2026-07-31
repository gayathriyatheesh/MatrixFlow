import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertCircle, Bookmark } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * Movie detail modal showing poster, title, genres,
 * and a "Get similar movies" button that calls the recommendation engine.
 *
 * Props:
 *   movie — { movie_id, title, poster_url, genres }
 *   onClose() — close the modal
 */
export default function MovieDetailModal({ movie, onClose }) {
  const { user, isAuthenticated, addToWatchlist, removeFromWatchlist, isInWatchlist } = useAuth();

  const [similarMovies, setSimilarMovies] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState('');
  const [showSimilar, setShowSimilar] = useState(false);

  if (!movie) return null;

  const isSaved = isInWatchlist(movie.movie_id);

  const handleGetSimilar = async () => {
    setLoadingSimilar(true);
    setSimilarError('');
    setSimilarMovies([]);
    setShowSimilar(true);

    try {
      // Step 1: Match user based on this single movie
      const matchRes = await api.post('/api/recommend/match-user', {
        movie_ids: [movie.movie_id]
      });
      const { matched_user_id } = matchRes.data;

      // Step 2: Get recommendations for the matched user
      const recRes = await api.get(`/api/recommend/${matched_user_id}`, {
        params: { mode: 'hybrid', alpha: 0.6, beta: 0.4, n: 10 }
      });

      setSimilarMovies(recRes.data.results || []);
    } catch (err) {
      console.error('Failed to get similar movies:', err);
      setSimilarError(err.response?.data?.detail || 'Failed to find similar movies.');
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!isAuthenticated()) return;
    try {
      if (isSaved) {
        await removeFromWatchlist(movie.movie_id);
      } else {
        await addToWatchlist({
          movie_id: movie.movie_id,
          title: movie.title,
          poster_url: movie.poster_url
        });
      }
    } catch (err) {
      console.error('Watchlist toggle failed:', err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#111111] border border-white/10 max-w-2xl w-full rounded-lg overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-black/60 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* Movie Hero Section */}
          <div className="flex flex-col sm:flex-row">
            {/* Poster */}
            <div className="sm:w-[200px] flex-shrink-0">
              <div className="aspect-[2/3] bg-neutral-900 overflow-hidden">
                {movie.poster_url && (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-[0.2em] font-sans-editorial font-bold text-neutral-500 block mb-2">
                  Movie Details
                </span>
                <h2 className="font-serif-editorial text-2xl md:text-3xl font-bold text-white leading-tight mb-4">
                  {movie.title}
                </h2>

                {/* Genres */}
                {movie.genres && movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {movie.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 rounded-full text-[10px] font-sans-editorial font-semibold tracking-wider uppercase border border-white/10 text-neutral-300 bg-white/5"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleGetSimilar}
                  disabled={loadingSimilar}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-full text-[10px] font-sans-editorial uppercase tracking-wider font-bold transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-60"
                >
                  <Sparkles size={13} />
                  Get similar movies
                </button>

                {isAuthenticated() && (
                  <button
                    type="button"
                    onClick={handleWatchlistToggle}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-sans-editorial uppercase tracking-wider font-semibold transition-all duration-200 cursor-pointer border ${
                      isSaved
                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                        : 'bg-transparent border-white/20 hover:border-white text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Bookmark size={13} className={isSaved ? 'fill-purple-300' : ''} />
                    {isSaved ? 'In watchlist' : 'Add to watchlist'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Similar Movies Section */}
          <AnimatePresence>
            {showSimilar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-white/10"
              >
                <div className="p-6 sm:p-8">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-sans-editorial font-bold text-neutral-500 block mb-4">
                    Similar Movies
                  </span>

                  {loadingSimilar && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Spinner size={24} />
                      <p className="text-[10px] font-sans-editorial text-neutral-500 uppercase tracking-widest">
                        Finding similar movies...
                      </p>
                    </div>
                  )}

                  {similarError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 rounded p-3 flex items-center gap-2 text-xs">
                      <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                      <span className="font-sans-editorial">{similarError}</span>
                    </div>
                  )}

                  {!loadingSimilar && !similarError && similarMovies.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {similarMovies.map((sim, index) => (
                        <motion.div
                          key={sim.movie_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="group"
                        >
                          <div className="aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900 ring-1 ring-white/10 group-hover:ring-white/25 transition-all duration-200">
                            <img
                              src={sim.poster_url}
                              alt={sim.title}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] font-sans-editorial font-semibold text-neutral-300 leading-tight line-clamp-2">
                            {sim.title}
                          </p>
                          <p className="text-[8px] font-sans-editorial text-neutral-500 mt-0.5">
                            Score: {sim.hybrid_score.toFixed(2)}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
