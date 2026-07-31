import { motion } from 'framer-motion';
import { Bookmark, Trash2, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Watchlist = () => {
  const { watchlist, removeFromWatchlist } = useAuth();

  const handleRemove = async (movieId) => {
    try {
      await removeFromWatchlist(movieId);
    } catch (err) {
      console.error("Failed to remove movie from watchlist:", err);
    }
  };

  return (
    <div className="min-h-screen text-white px-8 py-12 relative">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-[10px] font-sans-editorial font-bold text-purple-400 uppercase tracking-[0.2em] block mb-2">
              Your Personal Collection &mdash; {watchlist.length} {watchlist.length === 1 ? 'Movie' : 'Movies'}
            </span>
            <h1 className="font-serif-editorial text-3xl md:text-4xl font-bold text-white">
              Watchlist
            </h1>
          </div>
          <Link
            to="/recommend"
            className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full text-xs font-sans-editorial font-bold uppercase tracking-wider transition-editorial self-start md:self-auto"
          >
            Find Recommendations &rarr;
          </Link>
        </div>

        {/* Empty State */}
        {watchlist.length === 0 ? (
          <div className="bg-[#111111] border border-white/10 rounded-sm p-16 text-center max-w-lg mx-auto space-y-6 my-12">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
              <Film size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif-editorial text-2xl font-bold text-white">Your Watchlist is Empty</h2>
              <p className="font-sans-editorial text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                Save movies from your recommendation results to build your personal taste profile and watch queue.
              </p>
            </div>
            <Link
              to="/recommend"
              className="inline-block px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-xs font-sans-editorial font-bold uppercase tracking-wider transition-editorial"
            >
              Explore Movies
            </Link>
          </div>
        ) : (
          /* Movies Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {watchlist.map((movie, index) => (
              <motion.div
                key={movie.movie_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group flex flex-col h-[360px] bg-[#111111] border border-white/10 rounded-sm overflow-hidden relative"
              >
                <div className="relative h-[75%] bg-neutral-900 overflow-hidden">
                  <img
                    src={movie.poster_url || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop"}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-editorial"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(movie.movie_id)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/70 hover:bg-red-600/90 text-white/80 hover:text-white backdrop-blur-md transition-editorial cursor-pointer"
                    title="Remove from watchlist"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="h-[25%] p-4 flex flex-col justify-between border-t border-white/5 bg-[#111111]">
                  <h3 className="font-sans-editorial text-xs font-semibold leading-tight text-white line-clamp-2">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between text-[9px] font-sans-editorial text-neutral-500 uppercase tracking-widest pt-1">
                    <span className="flex items-center gap-1 text-purple-400 font-bold">
                      <Bookmark size={10} className="fill-purple-400" /> Saved
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(movie.movie_id)}
                      className="hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
