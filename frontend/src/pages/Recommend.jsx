import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Bookmark, Sparkles, Clock, Calendar, ExternalLink, Star } from 'lucide-react';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { ONBOARDING_MOVIES } from './Onboarding';

const QUIZ_MOVIES = ONBOARDING_MOVIES;

const BG_POSTERS = QUIZ_MOVIES.map(m => m.poster);

const PIPELINE_STEPS = [
  "Analysing your taste...",
  "Running SVD matrix factorisation...",
  "Scoring with CTR model...",
  "Applying hybrid formula..."
];

const Recommend = () => {
  const { user, isAuthenticated, watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useAuth();
  const location = useLocation();

  // Flow step: 'quiz' | 'matching' | 'results'
  const [step, setStep] = useState('quiz');
  const [selected, setSelected] = useState(new Set());
  const [mode, setMode] = useState('hybrid');
  const [alpha, setAlpha] = useState(0.7);
  const [pipelineIdx, setPipelineIdx] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [matchedUserId, setMatchedUserId] = useState(null);
  const [similarityScore, setSimilarityScore] = useState(null);
  const [error, setError] = useState(null);
  const [tooltipMovieId, setTooltipMovieId] = useState(null);

  // Tracks which case produced the results: 'watchlist' | 'profile' | 'quiz'
  const [recommendationSource, setRecommendationSource] = useState(null);

  // Rich movie detail modal state
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Auto-fetch recommendations for returning users who completed onboarding
  useEffect(() => {
    if (!isAuthenticated() || !user || !user.onboarding_complete) return;
    if (step === 'results' || step === 'matching') return;

    const fetchReturningUserRecommendations = async () => {
      // CASE 2: Returning user WITH watchlist (≥1 movies)
      if (watchlist && watchlist.length > 0) {
        setStep('matching');
        setPipelineIdx(0);
        setRecommendationSource('watchlist');

        const watchlistMovieIds = watchlist.map(m => m.movie_id).filter(Boolean);

        // Run matching animation
        const animationPromise = (async () => {
          for (let i = 0; i < PIPELINE_STEPS.length; i++) {
            setPipelineIdx(i);
            await new Promise(r => setTimeout(r, 1000));
          }
        })();

        try {
          // Call match-user with watchlist IDs
          const matchRes = await api.post('/api/recommend/match-user', { movie_ids: watchlistMovieIds });
          const { matched_user_id, similarity_score } = matchRes.data;
          setMatchedUserId(matched_user_id);
          setSimilarityScore(similarity_score);

          // Fetch recommendations
          const recRes = await api.get(`/api/recommend/${matched_user_id}`, {
            params: { mode: 'hybrid', alpha: 0.7, beta: 0.3, n: 10 }
          });
          setRecommendations(recRes.data.results);

          await animationPromise;
          setStep('results');
        } catch (err) {
          console.error("Case 2 (watchlist) recommendations failed:", err);
          await animationPromise;
          setStep('quiz');
        }
        return;
      }

      // CASE 3: Returning user WITHOUT watchlist — use saved matched_movielens_user_id
      if (user.matched_movielens_user_id) {
        setStep('matching');
        setPipelineIdx(0);
        setMatchedUserId(user.matched_movielens_user_id);
        setRecommendationSource('profile');

        // Run matching animation
        const animationPromise = (async () => {
          for (let i = 0; i < PIPELINE_STEPS.length; i++) {
            setPipelineIdx(i);
            await new Promise(r => setTimeout(r, 1000));
          }
        })();

        try {
          const res = await api.get(`/api/recommend/${user.matched_movielens_user_id}`, {
            params: { mode: 'hybrid', alpha: 0.7, beta: 0.3, n: 10 }
          });
          setRecommendations(res.data.results);

          await animationPromise;
          setStep('results');
        } catch (err) {
          console.error("Case 3 (profile) recommendations failed:", err);
          await animationPromise;
          setStep('quiz');
        }
        return;
      }

      // Fallback: onboarding is complete but no watchlist and no matched user — show quiz
      setStep('quiz');
    };

    fetchReturningUserRecommendations();
  }, [user?.onboarding_complete, user?.matched_movielens_user_id, watchlist?.length]);
  const toggleMovie = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runMatching = async () => {
    setError(null);
    setStep('matching');
    setPipelineIdx(0);
    setRecommendationSource('quiz');

    const beta = (1 - alpha).toFixed(1);
    const movieIds = Array.from(selected);

    // Animate pipeline steps
    const animationPromise = (async () => {
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        setPipelineIdx(i);
        await new Promise(r => setTimeout(r, 1000));
      }
    })();

    try {
      // 1. Match user via cosine similarity
      const matchRes = await api.post('/api/recommend/match-user', { movie_ids: movieIds });
      const { matched_user_id, similarity_score } = matchRes.data;
      setMatchedUserId(matched_user_id);
      setSimilarityScore(similarity_score);

      // 2. Fetch recommendations for matched user
      const recRes = await api.get(`/api/recommend/${matched_user_id}`, {
        params: { mode, alpha, beta, n: 10 }
      });
      setRecommendations(recRes.data.results);

      await animationPromise;
      setStep('results');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch recommendations.');
      await animationPromise;
      setStep('quiz');
    }
  };

  // Fetch rich movie details from TMDB via our backend
  const fetchMovieDetails = async (movie) => {
    setSelectedMovie(movie);
    setMovieDetails(null);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/recommend/movie-details/${movie.movie_id}`);
      setMovieDetails(res.data);
    } catch (err) {
      console.error('Failed to fetch movie details:', err);
      // Fallback to basic data
      setMovieDetails({
        movie_id: movie.movie_id,
        title: movie.title,
        poster_url: movie.poster_url,
        genres: [],
        cast: [],
        watch_providers_in: null,
        justwatch_url: `https://www.justwatch.com/in/search?q=${movie.title}`
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedMovie(null);
    setMovieDetails(null);
  };

  const refetchWithMode = async (newMode, newAlpha) => {
    if (!matchedUserId) return;
    setError(null);
    const beta = (1 - newAlpha).toFixed(1);
    try {
      const res = await api.get(`/api/recommend/${matchedUserId}`, {
        params: { mode: newMode, alpha: newAlpha, beta, n: 10 }
      });
      setRecommendations(res.data.results);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to re-fetch.');
    }
  };

  const handleModeChange = (m) => { setMode(m); refetchWithMode(m, alpha); };
  const handleAlphaChange = (a) => { setAlpha(a); refetchWithMode(mode, a); };

  const startOver = () => {
    setStep('quiz');
    setSelected(new Set());
    setRecommendations([]);
    setMatchedUserId(null);
    setSimilarityScore(null);
    setError(null);
  };

  const getNormalizedCF = (cf_score) => {
    if (!recommendations.length) return 0;
    const scores = recommendations.map(r => r.cf_score);
    const min = Math.min(...scores), max = Math.max(...scores), range = max - min;
    return range === 0 ? 1 : (cf_score - min) / range;
  };

  // Helper: get match percentage color
  const getMatchColor = (score) => {
    const pct = Math.round(score * 100);
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  // ─── STEP 1: Movie Taste Quiz ───
  if (step === 'quiz') {
    return (
      <div className="relative min-h-[90vh] px-4 py-12 overflow-hidden">
        {/* Poster grid background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-3 w-[104%] h-[104%] -translate-x-[2%] -translate-y-[2%] opacity-30">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-neutral-900 rounded overflow-hidden">
                <img src={BG_POSTERS[i % BG_POSTERS.length]} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 z-0 bg-black/80 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="font-serif-editorial text-4xl md:text-5xl font-bold text-white mb-3"
            >
              Pick movies you've loved.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="font-sans-editorial text-sm text-neutral-400"
            >
              Choose at least 3. We'll find your taste profile.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-4 text-xs font-sans-editorial font-bold uppercase tracking-widest text-neutral-500"
            >
              {selected.size} of 3 selected (pick more for better accuracy)
            </motion.div>
          </div>

          {/* Movie grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-10">
            {QUIZ_MOVIES.map((movie) => {
              const isSelected = selected.has(movie.movie_id);
              return (
                <motion.button
                  key={movie.movie_id}
                  type="button"
                  onClick={() => toggleMovie(movie.movie_id)}
                  whileTap={{ scale: 0.97 }}
                  className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 group ${isSelected
                    ? 'ring-2 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02]'
                    : 'ring-1 ring-white/10 hover:ring-white/30'
                    }`}
                >
                  <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-[10px] sm:text-xs font-sans-editorial font-semibold text-white leading-tight line-clamp-2">{movie.title}</p>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                    >
                      <span className="text-white text-xs font-bold">✓</span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Bottom action */}
          <AnimatePresence>
            {selected.size >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-8 left-0 right-0 z-30 flex justify-center"
              >
                <button
                  type="button" onClick={runMatching}
                  className="px-10 py-4 bg-white text-black rounded-full font-sans-editorial font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-editorial shadow-2xl"
                >
                  Find my recommendations &rarr;
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded p-4 flex items-center gap-3 max-w-md mx-auto">
              <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
              <span className="text-xs font-sans-editorial">{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── STEP 2: Matching Animation ───
  if (step === 'matching') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="max-w-md w-full bg-[#111111] border border-white/10 rounded-sm p-10 shadow-2xl text-center"
        >
          <Spinner size={32} />
          <h2 className="font-serif-editorial text-2xl font-bold text-white mt-8 mb-8">
            Curation in progress.
          </h2>
          <div className="space-y-5 text-left max-w-xs mx-auto">
            {PIPELINE_STEPS.map((label, i) => (
              <motion.div key={i} className="flex items-center gap-4"
                initial={{ opacity: 0.3 }} animate={{ opacity: pipelineIdx >= i ? 1 : 0.3 }}
              >
                <span className={`w-2 h-2 rounded-full ${pipelineIdx >= i ? 'bg-purple-400' : 'bg-white/10'}`} />
                <span className={`text-[10px] uppercase tracking-widest font-sans-editorial ${pipelineIdx >= i ? 'text-white' : 'text-neutral-600'}`}>
                  {label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── STEP 3: Results ───
  return (
    <div className="min-h-screen text-white px-8 py-12 relative">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Banner for Logged-In User */}
        {user?.username && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-950/40 border border-purple-500/30 rounded-lg p-5 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="font-serif-editorial text-xl md:text-2xl font-bold text-white">
                  Welcome {user.username}. Here are your picks.
                </h2>
                <p className="text-xs font-sans-editorial text-neutral-400">
                  Curated based on your personalized taste profile and SVD matrix factorisation.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-[10px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-[0.2em] block mb-2">
              {recommendationSource === 'watchlist'
                ? 'Based on your watchlist'
                : recommendationSource === 'profile'
                  ? 'Based on your taste profile'
                  : `Based on your taste profile \u2014 matched to ${similarityScore ? (similarityScore * 100).toFixed(1) : '?'}% of users like you`
              }
            </span>
            <h1 className="font-serif-editorial text-3xl font-bold text-white">
              Your Recommendations.
            </h1>
          </div>
          <button type="button" onClick={startOver}
            className="px-5 py-2.5 border border-white/20 hover:border-white text-white rounded-full text-xs font-sans-editorial uppercase tracking-wider transition-editorial"
          >
            &larr; Start over
          </button>
        </div>

        {/* Model Controls */}
        <div className="bg-[#111111] border border-white/10 rounded-sm p-6 flex flex-col md:flex-row md:items-center gap-6">
          {/* Mode pills */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-widest mr-2">Mode</span>
            {['hybrid', 'cf_only', 'ctr_only'].map(m => (
              <button key={m} type="button" onClick={() => handleModeChange(m)}
                className={`px-3.5 py-2 rounded-full text-[10px] font-sans-editorial tracking-wider uppercase border transition-editorial ${mode === m ? 'bg-white border-white text-black font-semibold' : 'border-white/10 text-neutral-400 hover:text-white hover:border-white/30'
                  }`}
              >{m === 'hybrid' ? 'Hybrid' : m === 'cf_only' ? 'CF Only' : 'CTR Only'}</button>
            ))}
          </div>
          {/* Alpha slider */}
          {mode === 'hybrid' && (
            <div className="flex items-center gap-4 flex-1">
              <span className="text-[9px] font-sans-editorial text-neutral-500 uppercase tracking-widest whitespace-nowrap">α:{alpha} β:{(1 - alpha).toFixed(1)}</span>
              <input type="range" min="0.1" max="0.9" step="0.1" value={alpha}
                onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
                className="flex-1 h-[2px] bg-white/20 appearance-none cursor-pointer accent-white"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 rounded p-4 flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
            <span className="text-xs font-sans-editorial">{error}</span>
          </div>
        )}

        {/* 2×5 Results Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {recommendations.map((movie, index) => {
            const cfNorm = getNormalizedCF(movie.cf_score);
            const isSaved = isInWatchlist(movie.movie_id);

            const handleWatchlistClick = async (e) => {
              e.stopPropagation();
              if (!isAuthenticated()) {
                setTooltipMovieId(movie.movie_id);
                setTimeout(() => setTooltipMovieId(null), 2500);
                return;
              }
              try {
                if (isSaved) {
                  await removeFromWatchlist(movie.movie_id);
                } else {
                  await addToWatchlist(movie);
                }
              } catch (err) {
                console.error("Watchlist action failed:", err);
              }
            };

            return (
              <motion.div key={movie.movie_id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }}
                className="group flex flex-col h-[400px] bg-[#111111] border border-white/10 rounded-sm overflow-hidden"
              >
                <div className="relative h-[70%] overflow-hidden bg-neutral-900 border-b border-white/5">
                  <img src={movie.poster_url} alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-editorial" loading="lazy"
                  />
                  <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded-sm text-[9px] font-sans-editorial tracking-widest uppercase font-bold text-white">
                    #{index + 1}
                  </div>

                  {/* Bookmark icon button top right */}
                  <div className="absolute top-2 right-2 z-10 flex flex-col items-end">
                    <button
                      type="button"
                      onClick={handleWatchlistClick}
                      className={`p-1.5 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer ${isSaved
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                        : 'bg-black/60 text-white/70 hover:text-white hover:bg-black/80'
                        }`}
                      title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      <Bookmark size={14} className={isSaved ? "fill-white text-white" : ""} />
                    </button>
                    {tooltipMovieId === movie.movie_id && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-1 px-2 py-1 bg-black/90 border border-white/20 text-[9px] font-sans-editorial text-neutral-200 rounded shadow-lg whitespace-nowrap"
                      >
                        Login to save movies
                      </motion.div>
                    )}
                  </div>
                </div>
                <div className="h-[30%] p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-sans-editorial text-[11px] font-semibold leading-tight text-white line-clamp-1 mb-2">{movie.title}</h3>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-sans-editorial text-neutral-400">
                        <span>CF: {movie.cf_score.toFixed(2)}</span>
                        <div className="w-12 h-[2px] bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white/70" style={{ width: `${cfNorm * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-sans-editorial text-neutral-400">
                        <span>CTR: {(movie.ctr_prob * 100).toFixed(0)}%</span>
                        <div className="w-12 h-[2px] bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white/70" style={{ width: `${movie.ctr_prob * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-sans-editorial text-white font-semibold">
                        <span>Hybrid: {movie.hybrid_score.toFixed(2)}</span>
                        <div className="w-12 h-[2px] bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white" style={{ width: `${movie.hybrid_score * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => fetchMovieDetails(movie)}
                    className="w-full text-center text-[9px] uppercase tracking-wider text-neutral-400 hover:text-white font-bold transition-editorial cursor-pointer pt-2"
                  >Why recommended?</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── Rich Movie Detail Modal ─── */}
      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0d0d0d] border border-white/10 max-w-3xl w-full rounded-lg overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-black/60 text-neutral-400 hover:text-white transition-colors cursor-pointer backdrop-blur-sm"
              >
                <X size={16} />
              </button>

              {loadingDetails ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Spinner size={28} />
                  <span className="text-[10px] font-sans-editorial text-neutral-500 uppercase tracking-widest">
                    Loading movie details...
                  </span>
                </div>
              ) : movieDetails ? (
                <>
                  {/* Top Section: Poster + Details */}
                  <div className="flex flex-col sm:flex-row">
                    {/* Poster */}
                    <div className="sm:w-[240px] flex-shrink-0">
                      <div className="aspect-[2/3] bg-neutral-900 overflow-hidden">
                        <img
                          src={movieDetails.poster_url || selectedMovie.poster_url}
                          alt={movieDetails.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Right Side: Details */}
                    <div className="flex-1 p-6 sm:p-8 flex flex-col">
                      {/* Match Score */}
                      <div className="mb-4">
                        <span className={`text-3xl font-mono font-black ${getMatchColor(selectedMovie.hybrid_score)}`}>
                          {Math.round(selectedMovie.hybrid_score * 100)}%
                        </span>
                        <span className="text-[10px] font-sans-editorial font-bold uppercase tracking-widest text-neutral-400 ml-2">
                          Match
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="font-serif-editorial text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                        {movieDetails.title || selectedMovie.title}
                      </h2>

                      {/* Year + Runtime */}
                      <div className="flex items-center gap-3 text-xs font-sans-editorial text-neutral-400 mb-4">
                        {movieDetails.release_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {movieDetails.release_date.split('-')[0]}
                          </span>
                        )}
                        {movieDetails.runtime && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {movieDetails.runtime} min
                          </span>
                        )}
                        {movieDetails.vote_average && (
                          <span className="flex items-center gap-1">
                            <Star size={12} className="text-yellow-500" />
                            {movieDetails.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Genre Tags */}
                      {movieDetails.genres && movieDetails.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {movieDetails.genres.map((genre) => (
                            <span
                              key={genre}
                              className="px-2.5 py-1 rounded-full text-[9px] font-sans-editorial font-semibold tracking-wider uppercase border border-white/10 text-neutral-300 bg-white/5"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Overview */}
                      {movieDetails.overview && (
                        <p className="text-xs font-sans-editorial text-neutral-400 leading-relaxed line-clamp-4 mb-5">
                          {movieDetails.overview}
                        </p>
                      )}

                      {/* Score Breakdown */}
                      <div className="grid grid-cols-3 gap-2 mt-auto">
                        {[
                          ['CF Score', selectedMovie.cf_score.toFixed(2)],
                          ['CTR Prob', `${(selectedMovie.ctr_prob * 100).toFixed(0)}%`],
                          ['Hybrid', selectedMovie.hybrid_score.toFixed(2)]
                        ].map(([label, val]) => (
                          <div key={label} className="bg-white/5 border border-white/5 py-2 px-3 rounded text-center">
                            <span className="block text-[8px] uppercase tracking-wider font-sans-editorial font-bold text-neutral-500 mb-0.5">{label}</span>
                            <span className="text-xs font-mono font-bold text-white">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cast Section */}
                  {movieDetails.cast && movieDetails.cast.length > 0 && (
                    <div className="px-6 sm:px-8 py-5 border-t border-white/5">
                      <span className="text-[9px] uppercase tracking-[0.2em] font-sans-editorial font-bold text-neutral-500 block mb-3">
                        Top Cast
                      </span>
                      <div className="flex gap-4 overflow-x-auto pb-1">
                        {movieDetails.cast.map((person, i) => (
                          <div key={i} className="flex-shrink-0 text-center w-16">
                            <div className="w-12 h-12 rounded-full mx-auto overflow-hidden bg-neutral-800 ring-1 ring-white/10 mb-1.5">
                              {person.profile_path ? (
                                <img
                                  src={person.profile_path}
                                  alt={person.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-600 text-[10px] font-bold">
                                  {person.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <p className="text-[9px] font-sans-editorial font-semibold text-white leading-tight truncate">
                              {person.name}
                            </p>
                            <p className="text-[8px] font-sans-editorial text-neutral-500 leading-tight truncate">
                              {person.character}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Watch Providers Section */}
                  <div className="px-6 sm:px-8 py-5 border-t border-white/5">
                    <span className="text-[9px] uppercase tracking-[0.2em] font-sans-editorial font-bold text-neutral-500 block mb-3">
                      Where to Watch
                    </span>
                    {movieDetails.watch_providers_in && movieDetails.watch_providers_in.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {movieDetails.watch_providers_in.map((provider, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-3 py-1.5">
                            {provider.logo_url && (
                              <img
                                src={provider.logo_url}
                                alt={provider.provider_name}
                                className="w-5 h-5 rounded-sm object-cover"
                                loading="lazy"
                              />
                            )}
                            <span className="text-[10px] font-sans-editorial font-semibold text-neutral-300">
                              {provider.provider_name}
                            </span>
                            <span className="text-[8px] font-sans-editorial text-neutral-600 uppercase">
                              {provider.type === 'flatrate' ? 'Sub' : provider.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <a
                        href={movieDetails.justwatch_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-sans-editorial text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Check JustWatch.com for availability
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="px-6 sm:px-8 py-5 border-t border-white/5 flex items-center justify-between">
                    {isAuthenticated() && (
                      <button
                        type="button"
                        onClick={async () => {
                          const isSaved = isInWatchlist(selectedMovie.movie_id);
                          try {
                            if (isSaved) {
                              await removeFromWatchlist(selectedMovie.movie_id);
                            } else {
                              await addToWatchlist({
                                movie_id: selectedMovie.movie_id,
                                title: selectedMovie.title,
                                poster_url: selectedMovie.poster_url
                              });
                            }
                          } catch (err) {
                            console.error('Watchlist action failed:', err);
                          }
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-sans-editorial uppercase tracking-wider font-semibold transition-all duration-200 cursor-pointer border ${isInWatchlist(selectedMovie.movie_id)
                          ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                          : 'bg-transparent border-white/20 hover:border-white text-neutral-300 hover:text-white'
                          }`}
                      >
                        <Bookmark size={13} className={isInWatchlist(selectedMovie.movie_id) ? 'fill-purple-300' : ''} />
                        {isInWatchlist(selectedMovie.movie_id) ? 'In Watchlist' : 'Add to Watchlist'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-full text-[10px] font-sans-editorial uppercase tracking-wider font-bold transition-editorial cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Recommend;
