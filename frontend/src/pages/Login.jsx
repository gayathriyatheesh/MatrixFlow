import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import Spinner from '../components/Spinner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const emailVal = email.trim();
    const pwdVal = password;
    
    if (!emailVal || !pwdVal) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email: emailVal, password: pwdVal });
      login(res.data.access_token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full bg-[#111111] border border-white/10 rounded-sm p-8 sm:p-10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <span className="text-[10px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-[0.2em] block mb-2">
            Welcome back
          </span>
          <h2 className="font-serif-editorial text-3xl font-bold text-white">
            Sign in to MatrixFlow
          </h2>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-200 rounded p-4 flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
            <span className="text-xs font-sans-editorial">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-sans-editorial font-bold text-neutral-400 uppercase tracking-wider block">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/45 border border-white/10 rounded-sm px-4 py-3 text-sm font-sans-editorial text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-editorial"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-sans-editorial font-bold text-neutral-400 uppercase tracking-wider block">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/45 border border-white/10 rounded-sm px-4 py-3 text-sm font-sans-editorial text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-editorial"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-600 disabled:text-neutral-400 rounded-full font-sans-editorial font-bold text-xs uppercase tracking-wider transition-editorial flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Spinner size={16} /> : 'Login'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs font-sans-editorial text-neutral-400 border-t border-white/5 pt-6">
          New to MatrixFlow?{' '}
          <Link to="/signup" className="text-white hover:underline font-semibold">
            Create account
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
