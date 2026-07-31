import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Configure api instance to use token on mount and when token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Fetch watchlist for current user
  const fetchWatchlist = async () => {
    try {
      const res = await api.get('/api/watchlist');
      setWatchlist(res.data || []);
    } catch (err) {
      console.error("Failed to fetch watchlist:", err);
    }
  };

  // Fetch current user details
  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/auth/me');
      setUser(res.data);
      await fetchWatchlist();
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      // If unauthorized or token expired, clear state
      setUser(null);
      setWatchlist([]);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setUser(null);
      setWatchlist([]);
      setLoading(false);
    }
  }, [token]);

  const addToWatchlist = async (movie) => {
    try {
      const res = await api.post('/api/watchlist/add', {
        movie_id: movie.movie_id,
        title: movie.title,
        poster_url: movie.poster_url
      });
      setWatchlist(prev => {
        if (prev.some(m => m.movie_id === movie.movie_id)) return prev;
        return [...prev, { movie_id: movie.movie_id, title: movie.title, poster_url: movie.poster_url }];
      });
      return res.data;
    } catch (err) {
      console.error("Failed to add to watchlist:", err);
      throw err;
    }
  };

  const removeFromWatchlist = async (movieId) => {
    try {
      const res = await api.post('/api/watchlist/remove', { movie_id: movieId });
      setWatchlist(prev => prev.filter(m => m.movie_id !== movieId));
      return res.data;
    } catch (err) {
      console.error("Failed to remove from watchlist:", err);
      throw err;
    }
  };

  const isInWatchlist = (movieId) => {
    return watchlist.some(m => m.movie_id === movieId);
  };

  const login = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setWatchlist([]);
  };

  const isAuthenticated = () => {
    return !!token;
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      watchlist,
      token,
      loading,
      login,
      logout,
      isAuthenticated,
      refetchUser: fetchCurrentUser,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      fetchWatchlist
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
