import { useState, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Recommend from './pages/Recommend';
import Metrics from './pages/Metrics';
import About from './pages/About';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Watchlist from './pages/Watchlist';
import Onboarding, { ONBOARDING_MOVIES } from './pages/Onboarding';
import ProtectedRoute from './components/ProtectedRoute';
import SearchBar from './components/SearchBar';
import MovieDetailModal from './components/MovieDetailModal';
import { AuthProvider, useAuth } from './context/AuthContext';

// Error Boundary — catches runtime errors so one broken component doesn't crash the page
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-8 py-16">
          <div className="bg-[#111111] border border-white/10 rounded-sm p-8 max-w-md w-full">
            <span className="text-[10px] font-sans-editorial font-bold text-red-400 uppercase tracking-[0.2em] block mb-3">
              Runtime Error
            </span>
            <h2 className="font-serif-editorial text-xl font-medium text-white mb-3">
              Something went wrong.
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed font-sans-editorial mb-6">
              {this.state.error?.message || 'An unexpected error occurred in this component.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2 bg-white text-black hover:bg-neutral-200 rounded-full text-[10px] font-sans-editorial uppercase tracking-wider font-bold transition-editorial cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const POSTERS = ONBOARDING_MOVIES.map(m => m.poster);

// Custom header component with dark semi-transparent styling
const Header = ({ onSelectMovie }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, watchlist, logout, isAuthenticated } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-md border-b border-white/10 px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left Aligned Logo */}
        <Link to="/" className="font-serif-editorial font-bold text-xl tracking-tight text-white hover:text-neutral-300 transition-colors">
          MatrixFlow
        </Link>

        {/* Right Aligned Navigation Links / Auth controls */}
        <div className="flex items-center gap-6">
          {isAuthenticated() && (
            <nav className="flex items-center gap-6 font-sans-editorial text-xs font-semibold tracking-wider uppercase">
              <Link 
                to="/" 
                className={`transition-editorial ${
                  isActive('/') ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/recommend" 
                className={`transition-editorial ${
                  isActive('/recommend') ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Recommend
              </Link>
              <Link 
                to="/watchlist" 
                className={`transition-editorial flex items-center gap-1 ${
                  isActive('/watchlist') ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Watchlist
                {watchlist.length > 0 && (
                  <span className="ml-0.5 text-[10px] font-bold text-purple-400 font-mono">
                    ({watchlist.length})
                  </span>
                )}
              </Link>
              <Link 
                to="/metrics" 
                className={`transition-editorial ${
                  isActive('/metrics') ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Metrics
              </Link>
              <Link 
                to="/about" 
                className={`transition-editorial ${
                  isActive('/about') ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                About
              </Link>
            </nav>
          )}

          {/* Search Bar — visible for authenticated users */}
          {isAuthenticated() && (
            <div className="border-l border-white/10 pl-4">
              <SearchBar onSelectMovie={onSelectMovie} />
            </div>
          )}

          {/* User Profile & Logout */}
          {isAuthenticated() ? (
            <div className="flex items-center gap-4 border-l border-white/10 pl-6">
              <span className="text-[10px] font-sans-editorial font-bold text-neutral-300 uppercase tracking-widest">
                {user?.username}
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="px-4 py-2 border border-white/10 hover:border-white text-white rounded-full text-[10px] font-sans-editorial uppercase tracking-wider font-semibold transition-editorial cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            (location.pathname !== '/login' && location.pathname !== '/signup') && (
              <Link 
                to="/login"
                className="px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded-full text-[10px] font-sans-editorial uppercase tracking-wider font-bold transition-editorial"
              >
                Login
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
};

// Page transition wrapper
const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10"
    >
      {children}
    </motion.div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Auth Routes */}
        <Route path="/login" element={<PageWrapper><ErrorBoundary><Login /></ErrorBoundary></PageWrapper>} />
        <Route path="/signup" element={<PageWrapper><ErrorBoundary><Signup /></ErrorBoundary></PageWrapper>} />

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<PageWrapper><ErrorBoundary><Home /></ErrorBoundary></PageWrapper>} />
          <Route path="/recommend" element={<PageWrapper><ErrorBoundary><Recommend /></ErrorBoundary></PageWrapper>} />
          <Route path="/watchlist" element={<PageWrapper><ErrorBoundary><Watchlist /></ErrorBoundary></PageWrapper>} />
          <Route path="/metrics" element={<PageWrapper><ErrorBoundary><Metrics /></ErrorBoundary></PageWrapper>} />
          <Route path="/about" element={<PageWrapper><ErrorBoundary><About /></ErrorBoundary></PageWrapper>} />
        </Route>

        <Route path="*" element={<PageWrapper><ErrorBoundary><NotFound /></ErrorBoundary></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

const AppContent = () => {
  const { user, isAuthenticated } = useAuth();
  const showQuestionnaire = isAuthenticated() && user && !user.onboarding_complete;

  // Movie detail modal state — shared between Header search and the rest of the app
  const [selectedMovie, setSelectedMovie] = useState(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans-editorial relative overflow-x-hidden">
      {showQuestionnaire && <Onboarding />}
      
      {/* Global Fixed Movie Poster Background Grid */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-4 w-[104%] h-[104%] -translate-x-[2%] -translate-y-[2%] opacity-60">
          {Array.from({ length: 48 }).map((_, idx) => (
            <div key={idx} className="aspect-[2/3] bg-neutral-900 rounded border border-white/5 overflow-hidden">
              <img 
                src={POSTERS[idx % POSTERS.length]} 
                alt="" 
                className="w-full h-full object-cover" 
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Dark Overlay (rgba 0, 0, 0, 0.75) */}
      <div className="fixed inset-0 z-0 bg-black/75 pointer-events-none" />

      {/* Navigation Header */}
      <Header onSelectMovie={setSelectedMovie} />

      {/* Main Content Area */}
      <main className="flex-grow relative z-10">
        <AnimatedRoutes />
      </main>

      {/* Minimal Footer */}
      <footer className="bg-black/40 backdrop-blur-sm border-t border-white/10 px-8 py-8 text-[10px] tracking-wider text-neutral-500 uppercase font-sans-editorial relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            &copy; {new Date().getFullYear()} MatrixFlow.
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-neutral-300 transition-colors">Documentation</a>
            <a href="#" className="hover:text-neutral-300 transition-colors">API Reference</a>
            <a href="#" className="hover:text-neutral-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

      {/* Movie Detail Modal — triggered from search */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieDetailModal
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
