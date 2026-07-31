import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Spinner from '../components/Spinner';

export const ONBOARDING_MOVIES = [
  { movie_id: 1, title: "Toy Story", poster: "https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg" },
  { movie_id: 318, title: "Shawshank Redemption", poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg" },
  { movie_id: 296, title: "Pulp Fiction", poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg" },
  { movie_id: 593, title: "Silence of the Lambs", poster: "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg" },
  { movie_id: 260, title: "Star Wars", poster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg" },
  { movie_id: 356, title: "Forrest Gump", poster: "https://image.tmdb.org/t/p/w500/Cw4hIUIAmSYfK9QfaUW5igp9La.jpg" },
  { movie_id: 480, title: "Jurassic Park", poster: "https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg" },
  { movie_id: 110, title: "Braveheart", poster: "https://image.tmdb.org/t/p/w500/or1gBugydmjToAEq7OZY0owwFk.jpg" },
  { movie_id: 457, title: "Schindler's List", poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { movie_id: 589, title: "Terminator 2", poster: "https://image.tmdb.org/t/p/w500/weVXMD5QBGeQil4HEATZqAkXeEc.jpg" },
  { movie_id: 2571, title: "The Matrix", poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { movie_id: 4993, title: "Lord of the Rings Fellowship", poster: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  { movie_id: 5952, title: "Lord of the Rings Two Towers", poster: "https://image.tmdb.org/t/p/w500/5VTN0pR8gcqV3EPUHHfMGnJYN9L.jpg" },
  { movie_id: 7153, title: "Lord of the Rings Return", poster: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg" },
  { movie_id: 79132, title: "Inception", poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
  { movie_id: 58559, title: "Dark Knight", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { movie_id: 6539, title: "Pirates of Caribbean", poster: "https://image.tmdb.org/t/p/w500/poHwCZeWzJCShH7tOjg8RIoyjcw.jpg" },
  { movie_id: 364, title: "Lion King", poster: "https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg" },
  { movie_id: 3578, title: "Gladiator", poster: "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg" },
  { movie_id: 551, title: "Fight Club", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { movie_id: 1721, title: "Titanic", poster: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg" },
  { movie_id: 2028, title: "Saving Private Ryan", poster: "https://image.tmdb.org/t/p/w500/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg" },
  { movie_id: 2762, title: "Sixth Sense", poster: "https://image.tmdb.org/t/p/w500/vOyfUXNFSnaTk7Vk5AjpsKTUWsu.jpg" },
  { movie_id: 1214, title: "Alien", poster: "https://image.tmdb.org/t/p/w500/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg" },
  // 6 additional movies to reach 30
  { movie_id: 2396, title: "Shakespeare in Love", poster: "https://image.tmdb.org/t/p/w500/hICnFVaRxdFaVnjM4GqpDz4gTYx.jpg" },
  { movie_id: 1265, title: "Groundhog Day", poster: "https://image.tmdb.org/t/p/w500/gCgt1WARPmBSCHjgKnAgadHkOf6.jpg" },
  { movie_id: 3996, title: "Shrek", poster: "https://image.tmdb.org/t/p/w500/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg" },
  { movie_id: 858, title: "The Godfather", poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { movie_id: 2959, title: "Fight Club", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { movie_id: 1196, title: "Empire Strikes Back", poster: "https://image.tmdb.org/t/p/w500/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg" },
];

// Full genre → movie_id mapping for preference quiz (Path B)
const GENRE_MOVIE_MAP = {
  'Action': [260, 589],
  'Comedy': [1, 364],
  'Drama': [318, 356],
  'Thriller': [593, 2762],
  'Romance': [1721, 2396],
  'Sci-Fi': [79132, 58559],
  'Horror': [1214, 1265],
  'Animation': [364, 3996],
  'Documentary': [1, 2],
  'Fantasy': [4993, 7153],
  'Crime': [296, 593],
  'Adventure': [480, 260]
};

const AGE_OPTIONS = ['Under 18', '18-25', '26-35', '36-50', '50+'];

const GENRE_OPTIONS = [
  'Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi', 
  'Horror', 'Animation', 'Documentary', 'Fantasy', 'Crime', 'Adventure'
];

const CONTENT_OPTIONS = ['Movies', 'Long Films', 'Series', 'Documentaries', 'Anything'];

const PIPELINE_STEPS = [
  "Analysing your taste...",
  "Running SVD matrix factorisation...",
  "Scoring with CTR model...",
  "Applying hybrid formula..."
];

const TOTAL_QUESTIONS = 3;

export default function Onboarding() {
  const { user, isAuthenticated, refetchUser } = useAuth();
  const navigate = useNavigate();

  // Top-level step: 'movies' | 'quiz' | 'matching'
  const [step, setStep] = useState('movies');
  const [selectedMovies, setSelectedMovies] = useState(new Set());

  // Quiz sub-step (0, 1, 2)
  const [questionIdx, setQuestionIdx] = useState(0);

  // Quiz form state
  const [age, setAge] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [contentLength, setContentLength] = useState('');

  // Matching state
  const [pipelineIdx, setPipelineIdx] = useState(0);
  const [error, setError] = useState('');

  // Redirect users who have already completed onboarding directly to /recommend
  useEffect(() => {
    if (isAuthenticated() && user && user.onboarding_complete) {
      navigate('/recommend', { replace: true });
    }
  }, [user, isAuthenticated, navigate]);

  const toggleMovie = (id) => {
    setSelectedMovies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGenre = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  // ── Path A: Movies selected → skip quiz, go straight to matching ──
  const handleMoviesContinue = async () => {
    if (selectedMovies.size < 3) return;
    setStep('matching');
    setPipelineIdx(0);
    setError('');

    const movieIds = Array.from(selectedMovies);

    // Run animation and API call in parallel
    const animationPromise = (async () => {
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        setPipelineIdx(i);
        await new Promise(r => setTimeout(r, 1000));
      }
    })();

    try {
      // Call match-user (persists matched_movielens_user_id + sets onboarding_complete)
      await api.post('/api/recommend/match-user', { movie_ids: movieIds });

      // Ensure animation finishes
      await animationPromise;

      // Refetch user profile so AuthContext knows onboarding is done
      await refetchUser();

      // Redirect to /recommend
      navigate('/recommend', { state: { welcome: true }, replace: true });
    } catch (err) {
      console.error("Path A matching failed:", err);
      setError(err.response?.data?.detail || "Failed to match your taste profile.");
    }
  };

  // ── Path B: "Don't recognise any?" → go to quiz ──
  const handleSkipToQuiz = () => {
    setSelectedMovies(new Set());
    setQuestionIdx(0);
    setStep('quiz');
  };

  // Check if the current question has been answered
  const isCurrentQuestionAnswered = () => {
    switch (questionIdx) {
      case 0: return Boolean(age);
      case 1: return selectedGenres.length > 0;
      case 2: return Boolean(contentLength);
      default: return false;
    }
  };

  const handleNextQuestion = () => {
    if (questionIdx < TOTAL_QUESTIONS - 1 && isCurrentQuestionAnswered()) {
      setQuestionIdx(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (questionIdx > 0) {
      setQuestionIdx(prev => prev - 1);
    }
  };

  const isAllQuestionsComplete = Boolean(age && selectedGenres.length > 0 && contentLength);

  // ── Path B completion: quiz → matching ──
  const startQuizMatching = async () => {
    if (!isAllQuestionsComplete) return;
    setStep('matching');
    setPipelineIdx(0);
    setError('');

    // Map genres to movie_ids
    const mappedSet = new Set();
    selectedGenres.forEach(g => {
      const mids = GENRE_MOVIE_MAP[g] || [];
      mids.forEach(m => mappedSet.add(m));
    });
    let movieIdsToMatch = Array.from(mappedSet);
    if (movieIdsToMatch.length === 0) {
      movieIdsToMatch = [1, 318, 296, 260, 593]; // Default fallback
    }

    // Run animation and API calls in parallel
    const animationPromise = (async () => {
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        setPipelineIdx(i);
        await new Promise(r => setTimeout(r, 1000));
      }
    })();

    try {
      // 1. Call match-user (persists matched_movielens_user_id + sets onboarding_complete)
      await api.post('/api/recommend/match-user', { movie_ids: movieIdsToMatch });

      // 2. Save preferences to user profile
      await api.post('/api/auth/preferences', {
        age: age,
        age_group: age,
        preferred_genres: selectedGenres,
        content_length: contentLength,
        duration: contentLength
      });

      // Ensure animation finishes
      await animationPromise;

      // 3. Refetch user profile
      await refetchUser();

      // 4. Redirect to /recommend
      navigate('/recommend', { state: { welcome: true }, replace: true });
    } catch (err) {
      console.error("Path B matching failed:", err);
      setError(err.response?.data?.detail || "Failed to complete onboarding setup.");
    }
  };

  // Progress bar for questions
  const progressPercent = ((questionIdx + 1) / TOTAL_QUESTIONS) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black font-sans-editorial text-white">
      {/* Global Fixed Movie Poster Grid Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 p-3 w-[104%] h-[104%] -translate-x-[2%] -translate-y-[2%] opacity-35">
          {ONBOARDING_MOVIES.map((m, i) => (
            <div key={i} className="aspect-[2/3] bg-neutral-900 rounded overflow-hidden">
              <img src={m.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
      <div className="fixed inset-0 z-0 bg-black/80 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 min-h-screen px-4 py-8 flex flex-col justify-between max-w-4xl mx-auto">
        
        {/* Step Progress Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <span className="font-serif-editorial font-bold text-lg tracking-tight text-white">
            MatrixFlow Curation
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
            {step === 'movies' ? 'Step 1' : step === 'quiz' ? 'Step 2' : 'Matching'}
          </span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP: Movie Picker (Path A entry) ── */}
          {step === 'movies' && (
            <motion.div
              key="movies"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 my-auto"
            >
              <div className="text-center space-y-2">
                <h1 className="font-serif-editorial text-3xl md:text-5xl font-bold text-white tracking-tight">
                  Anything you've seen and loved?
                </h1>
                <p className="font-sans-editorial text-sm text-neutral-400 max-w-md mx-auto">
                  Pick any movies you recognise. Skip if none look familiar.
                </p>
                <div className="text-xs uppercase font-bold tracking-widest text-neutral-500 pt-1">
                  {selectedMovies.size} selected
                </div>
              </div>

              {/* Movie Grid — 30 movies */}
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3.5 max-h-[50vh] overflow-y-auto pr-1 p-1">
                {ONBOARDING_MOVIES.map((movie) => {
                  const isSelected = selectedMovies.has(movie.movie_id);
                  return (
                    <motion.button
                      key={movie.movie_id}
                      type="button"
                      onClick={() => toggleMovie(movie.movie_id)}
                      whileTap={{ scale: 0.96 }}
                      className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 text-left group ${
                        isSelected
                          ? 'ring-2 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02]'
                          : 'ring-1 ring-white/10 hover:ring-white/30'
                      }`}
                    >
                      <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-[10px] sm:text-xs font-sans-editorial font-semibold text-white leading-tight line-clamp-2">{movie.title}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Bottom Actions — Two buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-white/10">
                {/* Path A: "These look familiar →" — active at ≥3 */}
                <button
                  type="button"
                  onClick={handleMoviesContinue}
                  disabled={selectedMovies.size < 3}
                  className={`px-8 py-3.5 rounded-full font-sans-editorial font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-xl ${
                    selectedMovies.size >= 3
                      ? 'bg-white hover:bg-neutral-200 text-black cursor-pointer'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  These look familiar &rarr;
                </button>

                {/* Path B: "Don't recognise any? →" — always visible */}
                <button
                  type="button"
                  onClick={handleSkipToQuiz}
                  className="px-6 py-3 rounded-full border border-white/30 hover:border-white text-neutral-300 hover:text-white font-sans-editorial font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer"
                >
                  Don't recognise any? &rarr;
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP: Preference Quiz (Path B) ── */}
          {step === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto space-y-6 my-auto w-full"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <h1 className="font-serif-editorial text-3xl md:text-5xl font-bold text-white tracking-tight">
                  Tell us your taste.
                </h1>
                <p className="font-sans-editorial text-sm text-neutral-400">
                  A few quick questions so we get it right.
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans-editorial font-bold uppercase tracking-widest text-neutral-500">
                    Question {questionIdx + 1} of {TOTAL_QUESTIONS}
                  </span>
                  <span className="text-[10px] font-sans-editorial font-bold uppercase tracking-widest text-purple-400">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-[#111111]/90 backdrop-blur-md border border-white/10 rounded-lg p-6 sm:p-8 shadow-2xl min-h-[240px] flex flex-col justify-center">
                <AnimatePresence mode="wait">

                  {/* Question 1: Age */}
                  {questionIdx === 0 && (
                    <motion.div
                      key="q1"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <label className="block text-sm font-bold uppercase tracking-wider text-neutral-200">
                        How old are you?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AGE_OPTIONS.map((option) => {
                          const isSelected = age === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setAge(option)}
                              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 border cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-lg shadow-purple-900/30'
                                  : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Question 2: Genres */}
                  {questionIdx === 1 && (
                    <motion.div
                      key="q2"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-neutral-200">
                          What genres excite you?
                        </label>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mt-1">
                          Pick as many as you want
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {GENRE_OPTIONS.map((genre) => {
                          const isSelected = selectedGenres.includes(genre);
                          return (
                            <button
                              key={genre}
                              type="button"
                              onClick={() => toggleGenre(genre)}
                              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 border cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-lg shadow-purple-900/30'
                                  : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                              }`}
                            >
                              {genre}
                              {isSelected && <Check size={12} />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Question 3: Content preference */}
                  {questionIdx === 2 && (
                    <motion.div
                      key="q3"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <label className="block text-sm font-bold uppercase tracking-wider text-neutral-200">
                        What do you prefer?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CONTENT_OPTIONS.map((option) => {
                          const isSelected = contentLength === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setContentLength(option)}
                              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 border cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-lg shadow-purple-900/30'
                                  : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {/* Left: Back button */}
                <button
                  type="button"
                  onClick={() => {
                    if (questionIdx === 0) {
                      setStep('movies');
                    } else {
                      handlePrevQuestion();
                    }
                  }}
                  className="px-6 py-2.5 text-neutral-400 hover:text-white font-sans-editorial text-xs uppercase tracking-wider font-semibold cursor-pointer transition-colors"
                >
                  &larr; Back
                </button>

                {/* Right: Next / Find my picks */}
                {questionIdx < TOTAL_QUESTIONS - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={!isCurrentQuestionAnswered()}
                    className={`px-8 py-3 rounded-full font-sans-editorial font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                      isCurrentQuestionAnswered()
                        ? 'bg-white hover:bg-neutral-200 text-black cursor-pointer shadow-xl'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startQuizMatching}
                    disabled={!isAllQuestionsComplete}
                    className={`px-10 py-3.5 rounded-full font-sans-editorial font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-2xl ${
                      isAllQuestionsComplete
                        ? 'bg-white hover:bg-neutral-200 text-black cursor-pointer'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Find my picks &rarr;
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP: Matching Animation (shared by both paths) ── */}
          {step === 'matching' && (
            <motion.div
              key="matching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md w-full mx-auto my-auto bg-[#111111] border border-white/10 rounded-sm p-10 shadow-2xl text-center"
            >
              <Spinner size={32} />
              <h2 className="font-serif-editorial text-2xl font-bold text-white mt-8 mb-8">
                Curation in progress.
              </h2>
              <div className="space-y-5 text-left max-w-xs mx-auto">
                {PIPELINE_STEPS.map((label, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: pipelineIdx >= i ? 1 : 0.3 }}
                  >
                    <span className={`w-2 h-2 rounded-full ${pipelineIdx >= i ? 'bg-purple-400' : 'bg-white/10'}`} />
                    <span className={`text-[10px] uppercase tracking-widest font-sans-editorial ${pipelineIdx >= i ? 'text-white' : 'text-neutral-600'}`}>
                      {label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {error && (
                <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-200 rounded p-3 flex items-center gap-2 text-xs text-left">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
