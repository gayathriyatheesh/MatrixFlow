import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Spinner from './Spinner';

const AGE_GROUPS = [
  'Under 18',
  '18–24',
  '25–34',
  '35–44',
  '45–54',
  '55+'
];

const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller'
];

const CONTENT_TYPES = [
  'Movie',
  'Series',
  'Documentary',
  'Anime'
];

const DURATIONS = [
  'Short (< 90 mins)',
  'Medium (90–120 mins)',
  'Long (> 120 mins)'
];

const MOODS = [
  'Funny',
  'Action',
  'Emotional',
  'Thriller',
  'Romantic',
  'Sci-Fi',
  'Horror',
  'Dark',
  'Inspiring'
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'Hindi',
  'Japanese',
  'Korean',
  'German',
  'Other'
];

export default function QuestionnaireModal() {
  const { refetchUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [ageGroup, setAgeGroup] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [contentType, setContentType] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const toggleMood = (mood) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter((m) => m !== mood));
    } else {
      setSelectedMoods([...selectedMoods, mood]);
    }
  };

  const toggleLanguage = (lang) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!ageGroup;
      case 2:
        return selectedGenres.length > 0;
      case 3:
        return !!contentType;
      case 4:
        return !!duration;
      case 5:
        return selectedMoods.length > 0;
      case 6:
        return selectedLanguages.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      setError('Please select an option to continue.');
      return;
    }
    setError('');
    setStep((prev) => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSkip = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/preferences/skip');
      await refetchUser();
    } catch (err) {
      console.error('Failed to skip questionnaire:', err);
      setError('Failed to skip questionnaire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) {
      setError('Please complete the current section.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/preferences', {
        age_group: ageGroup,
        preferred_genres: selectedGenres,
        content_type: contentType,
        duration: duration,
        mood: selectedMoods,
        preferred_languages: selectedLanguages
      });
      // Refetch user profile to update onboarding_complete flag in AuthContext
      await refetchUser();
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError(err.response?.data?.detail || 'Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full bg-[#111111] border border-white/10 rounded-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white font-sans-editorial"
      >
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={18} />
            <h3 className="font-serif-editorial font-bold text-lg tracking-tight text-white">
              Personalize Your Experience
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Step {step} of 6
            </span>
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors cursor-pointer border border-white/10 hover:border-white/30 px-2.5 py-1 rounded"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-1 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="bg-white h-full"
            initial={{ width: `${((step - 1) / 6) * 100}%` }}
            animate={{ width: `${(step / 6) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded p-3 flex items-center gap-2 text-xs">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[260px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h4 className="text-sm font-semibold text-neutral-200">
                  What is your age group?
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AGE_GROUPS.map((group) => (
                    <button
                      key={group}
                      onClick={() => {
                        setAgeGroup(group);
                        setError('');
                      }}
                      className={`py-3 px-4 rounded border text-xs font-medium transition-all text-center ${
                        ageGroup === group
                          ? 'bg-white text-black border-white shadow-lg font-bold'
                          : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-sm font-semibold text-neutral-200">
                    Which genres do you enjoy?
                  </h4>
                  <p className="text-[11px] text-neutral-400">Select all that apply</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {GENRES.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => {
                          toggleGenre(genre);
                          setError('');
                        }}
                        className={`py-2.5 px-3 rounded border text-xs font-medium flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                        }`}
                      >
                        <span>{genre}</span>
                        {isSelected && <Check size={14} className="text-black" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h4 className="text-sm font-semibold text-neutral-200">
                  What type of content do you prefer?
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setContentType(type);
                        setError('');
                      }}
                      className={`py-4 px-5 rounded border text-xs font-medium text-left transition-all ${
                        contentType === type
                          ? 'bg-white text-black border-white font-bold shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h4 className="text-sm font-semibold text-neutral-200">
                  What duration do you prefer to watch?
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DURATIONS.map((dur) => (
                    <button
                      key={dur}
                      onClick={() => {
                        setDuration(dur);
                        setError('');
                      }}
                      className={`py-4 px-5 rounded border text-xs font-medium text-left transition-all ${
                        duration === dur
                          ? 'bg-white text-black border-white font-bold shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-sm font-semibold text-neutral-200">
                    What mood fits your watching style?
                  </h4>
                  <p className="text-[11px] text-neutral-400">Select all that apply</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {MOODS.map((m) => {
                    const isSelected = selectedMoods.includes(m);
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          toggleMood(m);
                          setError('');
                        }}
                        className={`py-2.5 px-3 rounded border text-xs font-medium flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                        }`}
                      >
                        <span>{m}</span>
                        {isSelected && <Check size={14} className="text-black" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-sm font-semibold text-neutral-200">
                    What languages do you prefer?
                  </h4>
                  <p className="text-[11px] text-neutral-400">Select all that apply</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => {
                          toggleLanguage(lang);
                          setError('');
                        }}
                        className={`py-2.5 px-3 rounded border text-xs font-medium flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-white/5 border-white/10 hover:border-white/30 text-neutral-300'
                        }`}
                      >
                        <span>{lang}</span>
                        {isSelected && <Check size={14} className="text-black" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-600 rounded-full font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loading ? <Spinner size={16} /> : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

