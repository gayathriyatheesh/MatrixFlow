import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Film, Bookmark, Heart, CalendarDays, ChevronRight, Settings, Star } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip
} from 'recharts';

const RADAR_GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi', 'Horror', 'Animation'];

const Profile = () => {
  const { user, watchlist } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Derive initials
  const initials = (user.username || '')
    .split(/[\s_]+/)
    .map(w => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  // Stats
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  const favouriteGenre = user.preferred_genres && user.preferred_genres.length > 0
    ? user.preferred_genres[0]
    : '—';

  // Radar chart data
  const radarData = useMemo(() => {
    const userGenres = (user.preferred_genres || []).map(g => g.toLowerCase());
    return RADAR_GENRES.map(genre => ({
      genre,
      affinity: userGenres.includes(genre.toLowerCase()) ? 0.8 : 0.2,
      fullMark: 1
    }));
  }, [user.preferred_genres]);

  // Watchlist preview (first 6)
  const watchlistPreview = watchlist.slice(0, 6);

  // Content type label
  const contentLabel = user.content_type || '—';
  const ageLabel = user.age_group || user.age || '—';

  const handleEditPreferences = () => {
    // Reset onboarding to re-trigger the questionnaire
    // We navigate to /recommend and the onboarding overlay will handle it
    // For now, just navigate to recommend page which has the quiz
    navigate('/recommend');
  };

  return (
    <div className="min-h-screen text-white px-4 sm:px-8 py-12 relative">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* ─── Profile Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center ring-2 ring-purple-500/30 ring-offset-4 ring-offset-[#0a0a0a] shadow-xl shadow-purple-900/40 mb-5">
            <span className="text-3xl font-serif-editorial font-bold text-white select-none">
              {initials}
            </span>
          </div>
          <h1 className="font-serif-editorial text-3xl font-bold text-white mb-1">
            {user.username}
          </h1>
          <p className="text-xs font-sans-editorial text-neutral-500 tracking-wider">
            {user.email}
          </p>
        </motion.div>

        {/* ─── Stats Row ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { icon: Film, label: 'Recommendations', value: '10', sub: 'Movies matched' },
            { icon: Bookmark, label: 'Watchlist', value: String(watchlist.length), sub: 'Movies saved' },
            { icon: Heart, label: 'Top Genre', value: favouriteGenre, sub: 'Favourite genre' },
            { icon: CalendarDays, label: 'Member Since', value: memberSince, sub: 'Joined date' }
          ].map(({ icon: Icon, label, value, sub }, i) => (
            <div
              key={label}
              className="bg-[#111111]/80 backdrop-blur-sm border border-white/5 rounded-lg p-5 text-center hover:border-white/10 transition-colors"
            >
              <Icon size={16} className="mx-auto text-purple-400 mb-2.5" />
              <p className="text-lg font-mono font-bold text-white mb-0.5">{value}</p>
              <p className="text-[9px] font-sans-editorial text-neutral-500 uppercase tracking-widest">{sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ─── Taste Profile (Radar Chart) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111111]/80 backdrop-blur-sm border border-white/5 rounded-lg p-6 sm:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[9px] uppercase tracking-[0.2em] font-sans-editorial font-bold text-neutral-500 block mb-1">
                Taste DNA
              </span>
              <h2 className="font-serif-editorial text-xl font-bold text-white">
                Your Genre Profile
              </h2>
            </div>
            <Star size={16} className="text-purple-400" />
          </div>

          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <PolarAngleAxis
                  dataKey="genre"
                  tick={{
                    fill: '#a3a3a3',
                    fontSize: 10,
                    fontFamily: 'var(--font-sans-editorial, ui-sans-serif)',
                    fontWeight: 600
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 1]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Affinity"
                  dataKey="affinity"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-sans-editorial, ui-sans-serif)'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  itemStyle={{ color: '#a855f7' }}
                  formatter={(val) => [`${(val * 100).toFixed(0)}%`, 'Affinity']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ─── Watchlist Preview ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111111]/80 backdrop-blur-sm border border-white/5 rounded-lg p-6 sm:p-8"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[9px] uppercase tracking-[0.2em] font-sans-editorial font-bold text-neutral-500 block mb-1">
                Saved Movies
              </span>
              <h2 className="font-serif-editorial text-xl font-bold text-white">
                Watchlist
              </h2>
            </div>
            {watchlist.length > 6 && (
              <Link
                to="/watchlist"
                className="flex items-center gap-1 text-[10px] font-sans-editorial font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider transition-colors"
              >
                View all <ChevronRight size={12} />
              </Link>
            )}
          </div>

          {watchlistPreview.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {watchlistPreview.map((movie, i) => (
                <motion.div
                  key={movie.movie_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                  className="group"
                >
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900 ring-1 ring-white/5 group-hover:ring-white/20 transition-all duration-200">
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-700 text-[10px] font-bold p-2 text-center">
                        {movie.title}
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-[9px] font-sans-editorial font-semibold text-neutral-400 leading-tight line-clamp-2 text-center">
                    {movie.title}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Bookmark size={24} className="mx-auto text-neutral-700 mb-3" />
              <p className="text-xs font-sans-editorial text-neutral-500">
                No movies saved yet.
              </p>
              <Link
                to="/recommend"
                className="inline-block mt-3 text-[10px] font-sans-editorial font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider transition-colors"
              >
                Get recommendations →
              </Link>
            </div>
          )}
        </motion.div>

        {/* ─── Preferences Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111111]/80 backdrop-blur-sm border border-white/5 rounded-lg p-6 sm:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[9px] uppercase tracking-[0.2em] font-sans-editorial font-bold text-neutral-500 block mb-1">
                Onboarding Answers
              </span>
              <h2 className="font-serif-editorial text-xl font-bold text-white">
                Your Preferences
              </h2>
            </div>
            <button
              type="button"
              onClick={handleEditPreferences}
              className="flex items-center gap-1.5 px-4 py-2 border border-white/10 hover:border-white/30 text-neutral-300 hover:text-white rounded-full text-[10px] font-sans-editorial uppercase tracking-wider font-semibold transition-all duration-200 cursor-pointer"
            >
              <Settings size={12} />
              Edit preferences
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Age Group */}
            <div>
              <span className="text-[9px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-widest block mb-2">
                Age Group
              </span>
              <span className="inline-block px-4 py-2 bg-white/5 border border-white/5 rounded-full text-sm font-sans-editorial font-semibold text-white">
                {ageLabel}
              </span>
            </div>

            {/* Content Preference */}
            <div>
              <span className="text-[9px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-widest block mb-2">
                Content Preference
              </span>
              <span className="inline-block px-4 py-2 bg-white/5 border border-white/5 rounded-full text-sm font-sans-editorial font-semibold text-white">
                {contentLabel}
              </span>
            </div>

            {/* Matched User */}
            <div>
              <span className="text-[9px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-widest block mb-2">
                Taste Match ID
              </span>
              <span className="inline-block px-4 py-2 bg-white/5 border border-white/5 rounded-full text-sm font-mono font-bold text-purple-400">
                {user.matched_movielens_user_id ?? '—'}
              </span>
            </div>
          </div>

          {/* Genre pills */}
          {user.preferred_genres && user.preferred_genres.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <span className="text-[9px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-widest block mb-3">
                Preferred Genres
              </span>
              <div className="flex flex-wrap gap-2">
                {user.preferred_genres.map(genre => (
                  <span
                    key={genre}
                    className="px-3 py-1.5 rounded-full text-[10px] font-sans-editorial font-semibold tracking-wider uppercase bg-purple-500/15 border border-purple-500/25 text-purple-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default Profile;
