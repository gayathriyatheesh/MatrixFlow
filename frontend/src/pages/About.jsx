import { motion } from 'framer-motion';

const About = () => {
  return (
    <div className="min-h-screen text-white px-8 py-16 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Title */}
        <div className="border-b border-white/5 pb-8 mb-12">
          <span className="text-[10px] font-sans-editorial font-bold text-neutral-500 uppercase tracking-[0.2em] block mb-2">
            System & Model Architecture
          </span>
          <h1 className="font-serif-editorial text-4xl font-medium text-white">
            About MatrixFlow.
          </h1>
        </div>

        {/* Intro */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-[#111111] border border-white/10 rounded-sm p-8 mb-12 shadow-xl"
        >
          <h2 className="font-serif-editorial text-xl font-medium mb-4 text-white">Overview</h2>
          <p className="font-sans-editorial text-xs text-neutral-400 leading-relaxed mb-6">
            MatrixFlow is an advanced, production-grade hybrid recommendation system designed to optimize movie suggestions. By combining offline matrix factorization (collaborative filtering) with real-time probability estimates (click-through rate scoring), MatrixFlow delivers recommendations that balance a user's long-term latent interests with immediate engagement probability.
          </p>
          <div className="pt-4 border-t border-white/5 text-[10px] font-sans-editorial text-neutral-500 uppercase tracking-widest leading-relaxed">
            Data Source &bull; MovieLens 25M catalog mapped directly to TMDB API assets.
          </div>
        </motion.div>

        {/* Core Algorithms */}
        <div className="bg-[#111111] border border-white/10 rounded-sm p-8 shadow-xl mb-12 space-y-12 font-sans-editorial">
          <h2 className="font-serif-editorial text-2xl font-medium text-white border-b border-white/5 pb-3">The Core Engine</h2>

          {/* SVD */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest md:w-32 flex-shrink-0 pt-1">
              Phase 01
            </div>
            <div>
              <h3 className="font-serif-editorial text-lg font-medium text-white mb-2">Collaborative Filtering via SVD</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Singular Value Decomposition (SVD) factors the sparse user-movie interaction matrix into low-rank matrices.
                The SVD model maps each user $u$ and item $i$ into a 50-dimensional latent space:
              </p>
              <div className="text-xs px-4 py-3 bg-[#111111] border border-white/5 rounded-sm font-mono text-white mb-4">
                Prediction(u, i) = U[u] &middot; Sigma &middot; Vt[i]
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                This latent representation enables the system to discover complex, non-obvious movie preferences that traditional matching heuristics miss. On startup, candidate generation filters the catalog down to the top 100 films for the queried user.
              </p>
            </div>
          </motion.div>

          {/* CTR */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest md:w-32 flex-shrink-0 pt-1">
              Phase 02
            </div>
            <div>
              <h3 className="font-serif-editorial text-lg font-medium text-white mb-2">Real-Time CTR Prediction</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                While SVD uncovers long-term taste preferences, it does not capture current popularity patterns or general quality.
                The CTR model uses a Logistic Regression classifier to predict the click-through probability of each movie candidate.
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                Features include:
              </p>
              <ul className="list-disc pl-5 text-xs text-neutral-500 space-y-2 leading-relaxed">
                <li>User historical average rating and rating count (user engagement depth).</li>
                <li>Movie global average rating and rating count (item quality and popularity).</li>
              </ul>
            </div>
          </motion.div>

          {/* Hybrid */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest md:w-32 flex-shrink-0 pt-1">
              Phase 03
            </div>
            <div>
              <h3 className="font-serif-editorial text-lg font-medium text-white mb-2">Parametric Hybrid Re-ranking</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                To combine the SVD scores and CTR probabilities, the system applies min-max normalization to the collaborative filtering ratings, mapping them to the $[0, 1]$ interval.
                The final hybrid ranking score is computed as:
              </p>
              <div className="text-xs px-4 py-3 bg-[#111111] border border-white/5 rounded-sm font-mono text-white mb-4">
                HybridScore = (&alpha; &times; Normalized_CF) + (&beta; &times; CTR_Probability)
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                By adjusting the slider, the user can configure the engine to favor latent preference alignment ($\alpha$) or click probability ($\beta$). The top 10 movies are returned to the client.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Cold Start Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111111] border border-white/10 rounded-sm p-8 font-sans-editorial"
        >
          <h3 className="font-serif-editorial text-lg font-medium mb-3 text-white">
            Cold Start Handling
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            For users new to the platform (User IDs not found in the matrix factorization latent maps), MatrixFlow automatically triggers a fallback popularity model, returning the most active and highly rated movies from MongoDB. This ensures recommendations remain relevant for new users.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
