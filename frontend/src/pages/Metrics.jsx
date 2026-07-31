import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import Spinner from '../components/Spinner';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import { Star, AlertCircle } from 'lucide-react';

const Metrics = () => {
  // Global metrics state
  const [globalMetrics, setGlobalMetrics] = useState(null);
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  // User metrics state
  const [searchUserId, setSearchUserId] = useState('1'); // Default to 1 (seeded)
  const [userStats, setUserStats] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userError, setUserError] = useState(null);

  useEffect(() => {
    fetchGlobalMetrics();
    fetchUserStats('1');
  }, []);

  const fetchGlobalMetrics = async () => {
    setLoadingGlobal(true);
    try {
      const res = await api.get('/api/metrics');
      setGlobalMetrics(res.data);
    } catch (err) {
      console.error('Failed to fetch global metrics:', err);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const fetchUserStats = async (uid) => {
    if (!uid.trim()) return;
    setLoadingUser(true);
    setUserError(null);
    setUserStats(null);
    try {
      const res = await api.get(`/api/metrics/user/${uid}`);
      setUserStats(res.data);
    } catch (err) {
      setUserError(err.response?.data?.detail || `User ID ${uid} not found.`);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUserStats(searchUserId);
  };

  // Convert taste vector for Recharts RadarChart
  const getRadarData = () => {
    if (!userStats) return [];
    const genres = ["Action", "Comedy", "Drama", "Thriller", "Romance", "Sci-Fi", "Horror", "Animation"];
    return genres.map((g, idx) => ({
      genre: g,
      Affinity: userStats.taste_vector[idx] || 0
    }));
  };

  return (
    <div className="min-h-screen text-white px-8 py-16 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Title */}
        <div className="border-b border-white/5 pb-8 mb-12">
          <span className="text-[10px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-[0.2em] block mb-2">
            Performance & Curation Metrics
          </span>
          <h1 className="font-serif-editorial text-4xl font-medium text-white">
            Model Validation.
          </h1>
        </div>

        {/* Global Model Performance - Clean Data Table */}
        <div className="bg-[#111111] border border-white/10 rounded-sm p-8 shadow-xl mb-16">
          <h2 className="font-serif-editorial text-xl font-medium text-white mb-6">
            Evaluation Matrix
          </h2>

          {loadingGlobal ? (
            <div className="h-48 flex items-center justify-center">
              <Spinner size={24} />
            </div>
          ) : globalMetrics ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans-editorial">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-500 font-bold uppercase tracking-wider">
                    <th className="py-4 font-semibold">Evaluation Metric</th>
                    <th className="py-4 font-semibold">Collaborative (SVD)</th>
                    <th className="py-4 font-semibold">CTR (Logistic Reg)</th>
                    <th className="py-4 font-semibold text-white">Hybrid Mix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-300">
                  <tr>
                    <td className="py-4 font-semibold text-white">NDCG @ 10</td>
                    <td className="py-4">{globalMetrics.cf_only.ndcg_at_10.toFixed(4)}</td>
                    <td className="py-4">{globalMetrics.ctr_only.ndcg_at_10.toFixed(4)}</td>
                    <td className="py-4 text-white font-bold">{globalMetrics.hybrid.ndcg_at_10.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-white">Precision @ 10</td>
                    <td className="py-4">{globalMetrics.cf_only.precision_at_10.toFixed(4)}</td>
                    <td className="py-4">{globalMetrics.ctr_only.precision_at_10.toFixed(4)}</td>
                    <td className="py-4 text-white font-bold">{globalMetrics.hybrid.precision_at_10.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-white">ROC AUC Probability Score</td>
                    <td className="py-4 text-neutral-600">&mdash;</td>
                    <td className="py-4 text-neutral-300">{globalMetrics.ctr_only.auc_roc.toFixed(4)}</td>
                    <td className="py-4 text-neutral-600">&mdash;</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-white">Logarithmic Loss</td>
                    <td className="py-4 text-neutral-600">&mdash;</td>
                    <td className="py-4 text-neutral-300">{globalMetrics.ctr_only.log_loss.toFixed(4)}</td>
                    <td className="py-4 text-neutral-600">&mdash;</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-white">CTR @ 10</td>
                    <td className="py-4 text-neutral-600">&mdash;</td>
                    <td className="py-4 text-neutral-300">{globalMetrics.ctr_only.ctr_at_10.toFixed(4)}</td>
                    <td className="py-4 text-neutral-600">&mdash;</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-[10px] text-neutral-500 mt-4 leading-relaxed font-sans-editorial max-w-3xl">
                The blended hybrid model combines collaborative factorization (capturing long-term user affinity mapping) with real-time popular CTR adjustments, yielding a measurable improvement in NDCG@10.
              </p>
            </div>
          ) : null}
        </div>

        {/* Dataset Stats Row */}
        {!loadingGlobal && globalMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-t border-b border-white/5 mb-16 text-xs font-sans-editorial">
            <div>
              <span className="block text-neutral-500 font-bold uppercase tracking-wider mb-1">Catalog Users</span>
              <span className="text-lg font-bold text-white">{globalMetrics.dataset.n_users.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-neutral-500 font-bold uppercase tracking-wider mb-1">Catalog Movies</span>
              <span className="text-lg font-bold text-white">{globalMetrics.dataset.n_movies.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-neutral-500 font-bold uppercase tracking-wider mb-1">Total Ratings</span>
              <span className="text-lg font-bold text-white">{globalMetrics.dataset.n_ratings.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-neutral-500 font-bold uppercase tracking-wider mb-1">Matrix Sparsity</span>
              <span className="text-lg font-bold text-white">{(globalMetrics.dataset.sparsity * 100).toFixed(2)}%</span>
            </div>
          </div>
        )}

        {/* User Profile Analytics (Taste Radar Chart) */}
        <div className="bg-[#111111] border border-white/10 rounded-sm p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6 mb-8">
            <div>
              <h2 className="font-serif-editorial text-2xl font-medium text-white">
                User Taste Analytics.
              </h2>
              <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider font-sans-editorial">
                Visualise user average ratings and genre affinity matrices.
              </p>
            </div>

            {/* Search user ID form */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="number"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="User ID (e.g. 1)"
                className="bg-transparent border border-white/20 rounded-full px-4 py-2 text-xs text-white focus:outline-none focus:border-white transition-editorial w-32 font-sans-editorial"
              />
              <button
                type="submit"
                className="bg-white hover:bg-neutral-200 text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-editorial cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          {loadingUser ? (
            <div className="h-80 flex flex-col items-center justify-center gap-4">
              <Spinner size={24} />
              <span className="text-[10px] font-sans-editorial text-neutral-500 uppercase tracking-widest">Querying...</span>
            </div>
          ) : userError ? (
            <div className="h-80 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-sm">
              <AlertCircle size={32} className="text-neutral-500 mb-3" />
              <span className="text-white font-semibold text-sm mb-1">Lookup Error</span>
              <span className="text-xs text-neutral-500 max-w-sm leading-relaxed font-sans-editorial">{userError}</span>
            </div>
          ) : userStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              {/* Radar chart container - Black background, white lines */}
              <div className="bg-[#0a0a0a] border border-white/5 rounded-sm p-6 flex justify-center items-center h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                    <PolarGrid stroke="#222222" />
                    <PolarAngleAxis dataKey="genre" stroke="#666666" fontSize={9} fontWeight={600} tickLine={false} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#222222" fontSize={8} tickLine={false} />
                    <Radar
                      name="Affinity Score"
                      dataKey="Affinity"
                      stroke="#ffffff"
                      fill="#ffffff"
                      fillOpacity={0.1}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', color: '#fff', fontSize: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* User stats summary */}
              <div className="space-y-8 font-sans-editorial">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-sm">
                    <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Average Score</span>
                    <span className="text-xl font-serif-editorial font-bold text-white flex items-center gap-1.5">
                      <Star size={14} fill="currentColor" className="text-white" />
                      {userStats.avg_rating.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-sm">
                    <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Contributions</span>
                    <span className="text-xl font-serif-editorial font-bold text-white">
                      {userStats.n_rated} <span className="text-[10px] text-neutral-500 font-normal uppercase font-sans-editorial">titles</span>
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-3">Top Genres Affinity</span>
                  <div className="flex flex-wrap gap-2">
                    {userStats.top_genres.length > 0 ? (
                      userStats.top_genres.map((g, idx) => (
                        <span 
                          key={g} 
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-editorial uppercase tracking-wider ${
                            idx === 0 
                              ? 'bg-white text-black border-white' 
                              : 'bg-transparent border-white/10 text-neutral-400'
                          }`}
                        >
                          {g}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-600">No preference data available</span>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-neutral-500 leading-relaxed bg-[#0a0a0a] p-4 rounded-sm border border-white/5">
                  A user's taste vector represents their calculated affinity for each core genre. These affinities are aggregated directly from their historically rated movies, and are used as inputs in our hybrid prediction formulas.
                </p>
              </div>

            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-neutral-500 text-xs font-sans-editorial uppercase tracking-wider">
              Use the search bar above to fetch analytics for a user ID.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Metrics;
