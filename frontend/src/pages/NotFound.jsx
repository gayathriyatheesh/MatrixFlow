import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <div className="min-h-[75vh] bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md"
      >
        <span className="text-[10px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-[0.25em] block mb-4">
          Error Code 404
        </span>
        <h1 className="font-serif-editorial text-5xl md:text-6xl font-medium mb-6 text-white leading-tight">
          Page not found.
        </h1>
        <p className="font-sans-editorial text-xs text-neutral-400 max-w-sm mx-auto mb-10 leading-relaxed">
          The film reel or page you are looking for has either been moved, deleted, or never existed in the catalog.
        </p>
        <Link
          to="/"
          className="inline-block px-7 py-3 bg-white hover:bg-neutral-200 text-black rounded-full text-xs font-bold uppercase tracking-wider transition-editorial"
        >
          Return to home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
