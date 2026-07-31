import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const POSTERS = [
  "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
  "https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
  "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg",
  "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
  "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsLLeHCuMfq5q.jpg",
  "https://image.tmdb.org/t/p/w500/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg",
  "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
  "https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg",
  "https://image.tmdb.org/t/p/w500/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg",
  "https://image.tmdb.org/t/p/w500/lEV5K5oOEE3BZgvGJezO9BwNyQG.jpg",
  "https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg",
  "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "https://image.tmdb.org/t/p/w500/6MKr3KgOLmzOP6MSuZERO41Lpnp.jpg",
  "https://image.tmdb.org/t/p/w500/xBHvZcjRiWyobQ9kxBhO6B2dtRI.jpg",
  "https://image.tmdb.org/t/p/w500/qNBAXBIQlnOThrVvA6mA2B5ggkR.jpg",
  "https://image.tmdb.org/t/p/w500/nCt26br4qpFYzVBMrCWUnUubkS4.jpg",
  "https://image.tmdb.org/t/p/w500/1E5baAaEse26fej7uHcjOgEE2t2.jpg"
];

const Home = () => {
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-8 overflow-hidden">
      {/* Background Movie Poster Grid */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
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
      <div className="absolute inset-0 z-0 bg-black/75 pointer-events-none" />

      <div className="max-w-3xl text-center relative z-10 py-16">
        {/* Editorial Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-neutral-400 text-xs font-semibold uppercase tracking-[0.2em] font-sans-editorial mb-6"
        >
          Model v1.0.0 &bull; Hybrid Recommendation Engine
        </motion.div>

        {/* Large Centered Serif Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-serif-editorial text-5xl md:text-7xl font-bold tracking-tight leading-tight text-white mb-6"
        >
          The next film, <br />
          picked for you.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-sans-editorial text-sm md:text-base text-neutral-300 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Powered by SVD &times; CTR &times; Hybrid Scoring across 25M ratings
        </motion.p>

        {/* White Pill Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-center"
        >
          <Link
            to="/recommend"
            className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-sans-editorial font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-editorial"
          >
            Get my picks
            <ArrowRight size={14} className="ml-1" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
