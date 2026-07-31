import os
import pickle
import numpy as np
from dotenv import load_dotenv
from pathlib import Path

# Load env variables
load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "c:\\Users\\gayat\\OneDrive\\Desktop\\MovieLens_Project")

# Global singleton model instances
svd_model = None
ctr_model = None
U = None
sigma = None
Vt = None
user_map = None
movie_map = None
reverse_movie_map = None

def load_models():
    global svd_model, ctr_model, U, sigma, Vt, user_map, movie_map, reverse_movie_map
    
    svd_file = Path(MODEL_PATH) / "svd_model.pkl"
    ctr_file = Path(MODEL_PATH) / "ctr_model.pkl"
    
    if not svd_file.exists() or not ctr_file.exists():
        raise FileNotFoundError(f"Pickle model files not found in MODEL_PATH: {MODEL_PATH}")
        
    print(f"Loading SVD model from {svd_file}...")
    with open(svd_file, "rb") as f:
        svd_model = pickle.load(f)
        
    U = svd_model["U"]
    sigma = svd_model["sigma"]
    Vt = svd_model["Vt"]
    user_map = svd_model["user_map"]
    movie_map = svd_model["movie_map"]
    reverse_movie_map = {v: k for k, v in movie_map.items()}
    
    print(f"Loading CTR model from {ctr_file}...")
    with open(ctr_file, "rb") as f:
        ctr_model = pickle.load(f)
        
    print("Models loaded successfully (on-the-fly SVD prediction enabled to save memory).")

# Load models on module import
load_models()

def get_cf_candidates(user_id: int, n: int = 100):
    """
    Get top collaborative filtering movie candidates for the user.
    """
    uid = int(user_id)
    if uid not in user_map:
        return []
        
    row_idx = user_map[uid]
    
    # Compute the user's predicted ratings vector on-the-fly to save 4.2 GiB of RAM
    # U[row_idx] has shape (50,), sigma has shape (50, 50), Vt has shape (50, 10262)
    user_u = U[row_idx, :]
    user_ratings = np.dot(np.dot(user_u, sigma), Vt) # Resulting shape: (10262,)
    
    # Pair movie_id with rating
    candidates = []
    for col_idx, cf_score in enumerate(user_ratings):
        movie_id = reverse_movie_map.get(col_idx, None)
        if movie_id is not None:
            candidates.append({
                "movie_id": int(movie_id),
                "cf_score": float(cf_score)
            })
            
    # Sort descending by collaborative filtering score
    candidates.sort(key=lambda x: x["cf_score"], reverse=True)
    return candidates[:n]

def get_ctr_scores(user_id: int, candidate_movie_ids: list[int], ratings_collection):
    """
    Calculate click-through probability using Logistic Regression CTR model.
    """
    if not candidate_movie_ids:
        return []
        
    uid = int(user_id)
    
    # 1. Fetch user stats from MongoDB ratings collection
    user_ratings = list(ratings_collection.find({"user_id": uid}))
    if user_ratings:
        user_avg_rating = sum(r["rating"] for r in user_ratings) / len(user_ratings)
        user_rating_count = len(user_ratings)
    else:
        user_avg_rating = 0.0
        user_rating_count = 0
        
    # 2. Fetch movie stats for all candidates from ratings collection
    cand_mids = [int(mid) for mid in candidate_movie_ids]
    pipeline = [
        {"$match": {"movie_id": {"$in": cand_mids}}},
        {"$group": {
            "_id": "$movie_id",
            "avg_movie_rating": {"$avg": "$rating"},
            "movie_rating_count": {"$sum": 1}
        }}
    ]
    movie_stats = list(ratings_collection.aggregate(pipeline))
    movie_stats_map = {
        m["_id"]: {
            "avg_movie_rating": float(m["avg_movie_rating"]),
            "movie_rating_count": int(m["movie_rating_count"])
        } for m in movie_stats
    }
    
    # 3. Build features matrix and predict
    features = []
    for mid in cand_mids:
        stats = movie_stats_map.get(mid, {"avg_movie_rating": 0.0, "movie_rating_count": 0})
        features.append([
            float(user_avg_rating),
            int(user_rating_count),
            float(stats["avg_movie_rating"]),
            int(stats["movie_rating_count"])
        ])
        
    # Batch predict probabilities using Logistic Regression
    X = np.array(features)
    # Get probability of class 1 (click/like)
    try:
        probs = ctr_model.predict_proba(X)[:, 1]
    except Exception as e:
        print(f"Error predicting CTR probability: {e}")
        probs = np.zeros(len(cand_mids))
        
    results = []
    for idx, mid in enumerate(cand_mids):
        results.append({
            "movie_id": mid,
            "ctr_prob": float(probs[idx])
        })
        
    return results

def calculate_preference_score(movie_doc: dict, user_preferences: dict) -> float:
    """
    Calculate a normalized preference match score for a movie document based on user questionnaire responses.
    """
    if not user_preferences or not isinstance(user_preferences, dict):
        return 0.0
    
    target_genres = set(g.strip().lower() for g in user_preferences.get("preferred_genres", []) if g)
    moods = user_preferences.get("mood", [])
    content_type = (user_preferences.get("content_type") or "").strip().lower()
    
    # Map mood to target genres
    mood_to_genres = {
        "funny": ["comedy", "animation"],
        "action": ["action", "adventure"],
        "emotional": ["drama", "romance"],
        "thriller": ["thriller", "mystery", "crime"],
        "romantic": ["romance"],
        "sci-fi": ["sci-fi"],
        "horror": ["horror"],
        "dark": ["crime", "horror", "thriller", "film-noir"],
        "inspiring": ["drama", "documentary", "animation"]
    }
    
    for m in moods:
        m_clean = m.strip().lower()
        if m_clean in mood_to_genres:
            for g in mood_to_genres[m_clean]:
                target_genres.add(g)
                
    if "documentary" in content_type:
        target_genres.add("documentary")
    if "anime" in content_type:
        target_genres.add("animation")
        
    if not target_genres:
        return 0.0
        
    movie_genres = [g.strip().lower() for g in movie_doc.get("genres", [])]
    if not movie_genres:
        return 0.0
        
    overlap = sum(1 for g in movie_genres if g in target_genres)
    return float(overlap) / float(len(target_genres))

def get_hybrid_recommendations(user_id: int, ratings_collection, alpha: float = 0.7, beta: float = 0.3, top_n: int = 10, user_preferences: dict = None):
    """
    Get top hybrid recommendations, with cold start fallback and preference weighting.
    """
    from utils.db import movies_col
    uid = int(user_id)
    
    # 1. Check if user exists in user_map (Collaborative Filtering candidates)
    if uid not in user_map:
        # Cold start handling: candidate movies based on popularity and preferences
        print(f"User {uid} not in user_map. Applying cold start fallback.")
        popular_movies = list(ratings_collection.aggregate([
            {"$group": {"_id": "$movie_id", "movie_rating_count": {"$sum": 1}}},
            {"$sort": {"movie_rating_count": -1}},
            {"$limit": 200}
        ]))
        
        # If no ratings exist, fallback to top movies in the movies DB
        if not popular_movies:
            popular_movies = [{"_id": m["movie_id"]} for m in movies_col.find().limit(200)]
            
        cand_mids = [int(p["_id"]) for p in popular_movies]
        movie_docs = {m["movie_id"]: m for m in movies_col.find({"movie_id": {"$in": cand_mids}})}
        
        max_rating_count = max([p.get("movie_rating_count", 1) for p in popular_movies], default=1)
        
        cold_candidates = []
        for p in popular_movies:
            mid = int(p["_id"])
            movie_doc = movie_docs.get(mid, {})
            pop_score = p.get("movie_rating_count", 0) / max_rating_count
            pref_score = calculate_preference_score(movie_doc, user_preferences) if user_preferences else 0.0
            
            # Combine popularity score with questionnaire preference score
            combined_score = (0.5 * pop_score) + (0.5 * pref_score) if user_preferences else pop_score
            
            cold_candidates.append({
                "movie_id": mid,
                "cf_score": 0.0,
                "ctr_prob": float(pop_score),
                "hybrid_score": float(combined_score)
            })
            
        cold_candidates.sort(key=lambda x: x["hybrid_score"], reverse=True)
        return cold_candidates[:top_n]
        
    # 2. Get top 100 CF candidates
    cf_candidates = get_cf_candidates(uid, n=100)
    candidate_movie_ids = [c["movie_id"] for c in cf_candidates]
    
    # Fetch movie docs for candidates to compute preference scores
    movie_docs = {m["movie_id"]: m for m in movies_col.find({"movie_id": {"$in": candidate_movie_ids}})}
    
    # 3. Get CTR scores
    ctr_scores = get_ctr_scores(uid, candidate_movie_ids, ratings_collection)
    ctr_map = {item["movie_id"]: item["ctr_prob"] for item in ctr_scores}
    
    # 4. Normalize CF scores using Min-Max
    cf_scores = [c["cf_score"] for c in cf_candidates]
    min_cf = min(cf_scores) if cf_scores else 0.0
    max_cf = max(cf_scores) if cf_scores else 0.0
    cf_range = max_cf - min_cf
    
    # 5. Calculate hybrid scores with optional preference boosting
    hybrid_list = []
    for c in cf_candidates:
        mid = c["movie_id"]
        cf_val = c["cf_score"]
        ctr_val = ctr_map.get(mid, 0.0)
        movie_doc = movie_docs.get(mid, {})
        
        # Normalize CF score
        cf_norm = (cf_val - min_cf) / cf_range if cf_range > 0 else 1.0
        
        # Base hybrid score
        base_hybrid_score = (alpha * cf_norm) + (beta * ctr_val)
        
        # Preference boost
        pref_score = calculate_preference_score(movie_doc, user_preferences) if user_preferences else 0.0
        
        # Influence hybrid score: 80% SVD+CTR base + 20% preference match score
        if user_preferences and pref_score > 0:
            final_hybrid_score = (0.8 * base_hybrid_score) + (0.2 * pref_score)
        else:
            final_hybrid_score = base_hybrid_score
        
        hybrid_list.append({
            "movie_id": mid,
            "cf_score": cf_val,
            "ctr_prob": ctr_val,
            "hybrid_score": final_hybrid_score
        })
        
    # 6. Sort and limit to top_n
    hybrid_list.sort(key=lambda x: x["hybrid_score"], reverse=True)
    return hybrid_list[:top_n]

