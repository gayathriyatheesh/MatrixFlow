MatrixFlow — Hybrid Movie Recommendation System

A factorization-driven recommendation engine combining Collaborative Filtering (SVD), CTR Prediction (Logistic Regression), and Hybrid Scoring — trained on the MovieLens 25M dataset.

Live Demo: https://matrixflow-three.vercel.app
Backend API: https://matrixflow-backend.onrender.com/api/health
Dataset: MovieLens 25M (25 million ratings, 162,000 users, 62,000 movies)

How It Works

MatrixFlow uses a three-stage ML pipeline:

Stage 1 — Collaborative Filtering (SVD)
Matrix factorisation using Singular Value Decomposition with k=50 latent factors. Decomposes the 55,057 × 10,262 user-item rating matrix into U, Σ, and Vt to predict ratings and generate 100 candidate movies per user.

Stage 2 — CTR Prediction (Logistic Regression)
A logistic regression model trained on 4 behavioural features (avg_rating, rating_count, avg_movie_rating, movie_rating_count) to predict click probability for each candidate.

Stage 3 — Hybrid Scoring
Final ranking using the formula:
hybrid_score = 0.7 × CF_score + 0.3 × CTR_probability

Model Performance
Model	Precision@10	NDCG@10
Collaborative Filtering	0.30	0.4250
CTR Prediction	0.30	0.7737
Hybrid	0.30	0.5391

CTR Model: AUC-ROC = 0.846, Log Loss = 0.483

Tech Stack

ML & Data

Python, NumPy, SciPy, scikit-learn
MovieLens 25M dataset
Jupyter Notebooks (13 notebooks covering EDA to model comparison)

Backend

FastAPI, Uvicorn
MongoDB Atlas
TMDB API for movie metadata

Frontend

React + Vite + Tailwind CSS
Framer Motion, Recharts, Lucide React

Deployment

Backend: Render
Frontend: Vercel
Database: MongoDB Atlas
Features
Movie taste quiz on first login — picks 3+ movies you've seen and matches you to similar users using cosine similarity on SVD latent factors
Preference-based onboarding — age group, genre preferences, content type
Netflix-style recommendation grid with CF, CTR, and Hybrid score breakdown
"Why Recommended?" popup with cast, overview, genre tags, and OTT availability (India)
Watchlist — saved movies influence future recommendations
Model comparison toggle — switch between CF Only, CTR Only, and Hybrid to see how each stage contributes
Metrics dashboard — real evaluation results with genre radar chart
Project Structure
MatrixFlow/
├── notebooks/          # 13 Jupyter notebooks (EDA → Model Comparison)
├── backend/            # FastAPI backend
│   ├── routes/         # API endpoints
│   ├── services/       # Model loading and prediction
│   └── utils/          # DB connection and auth
├── frontend/           # React + Vite frontend
│   └── src/
│       ├── pages/      # Home, Recommend, Metrics, Watchlist
│       └── context/    # Auth and state management
└── *.pkl               # Trained model files
Running Locally

Backend

bash
cd backend
pip install -r requirements.txt
# Add .env with MONGO_URI, TMDB_API_KEY, SECRET_KEY, MODEL_PATH
python -m uvicorn main:app --reload --port 8000

Frontend

bash
cd frontend
npm install
npm run dev
Known Limitations
Dataset covers movies up to 2019 — newer releases are not in the training data
MovieLens 25M is predominantly Western cinema — limited regional and Indian movie representation
Cold start is handled via popularity-based fallback and preference quiz
Academic Context

Built as a research project under the supervision of Prof. Sandeep Verma at SRM University AP, Department of Mathematics.

This project was built as a team effort combining machine learning research, full-stack development, and systems integration.

MatrixFlow © 2026
