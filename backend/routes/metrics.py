from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

from utils.db import users_col, ratings_col

router = APIRouter(prefix="/metrics", tags=["metrics"])

class MetricCF(BaseModel):
    ndcg_at_10: float
    precision_at_10: float

class MetricCTR(BaseModel):
    ndcg_at_10: float
    precision_at_10: float
    auc_roc: float
    log_loss: float
    ctr_at_10: float

class MetricHybrid(BaseModel):
    ndcg_at_10: float
    precision_at_10: float

class DatasetStats(BaseModel):
    n_users: int
    n_movies: int
    n_ratings: int
    sparsity: float

class ModelDetails(BaseModel):
    svd_k: int
    lr_features: int
    hybrid_alpha: float
    hybrid_beta: float

class MetricsResponse(BaseModel):
    cf_only: MetricCF
    ctr_only: MetricCTR
    hybrid: MetricHybrid
    dataset: DatasetStats
    model_details: ModelDetails

class UserStatsResponse(BaseModel):
    avg_rating: float
    n_rated: int
    top_genres: List[str]
    taste_vector: List[float]

@router.get("", response_model=MetricsResponse)
def get_overall_metrics():
    """
    Return overall model evaluation results.
    """
    return {
        "cf_only": {
            "ndcg_at_10": 0.424960,
            "precision_at_10": 0.3
        },
        "ctr_only": {
            "ndcg_at_10": 0.773746,
            "precision_at_10": 0.3,
            "auc_roc": 0.846082,
            "log_loss": 0.483435,
            "ctr_at_10": 1.0
        },
        "hybrid": {
            "ndcg_at_10": 0.539107,
            "precision_at_10": 0.3
        },
        "dataset": {
            "n_users": 55057,
            "n_movies": 10262,
            "n_ratings": 25000095,
            "sparsity": 0.9975
        },
        "model_details": {
            "svd_k": 50,
            "lr_features": 4,
            "hybrid_alpha": 0.7,
            "hybrid_beta": 0.3
        }
    }

@router.get("/user/{user_id}", response_model=UserStatsResponse)
def get_user_stats(user_id: int):
    """
    Get user profile stats including taste vector (affinity scores for 8 primary genres).
    """
    uid = int(user_id)
    
    # 1. Fetch user doc
    user_doc = users_col.find_one({"user_id": uid})
    if not user_doc:
        # Check if they exist in ratings at all
        if ratings_col.count_documents({"user_id": uid}) == 0:
            raise HTTPException(status_code=404, detail=f"User ID {uid} not found in database.")
        else:
            # Construct a default doc if ratings exist but user doc wasn't generated
            user_doc = {
                "user_id": uid,
                "avg_rating": 3.5,
                "genre_affinity": {}
            }

    # 2. Count ratings for the user
    n_rated = ratings_col.count_documents({"user_id": uid})
    
    # 3. Extract top genres (sorted by affinity score descending)
    genre_affinity = user_doc.get("genre_affinity", {})
    sorted_genres = sorted(genre_affinity.items(), key=lambda x: x[1], reverse=True)
    top_genres = [g[0] for g in sorted_genres[:5]] # Top 5 genres
    
    # 4. Construct taste vector for Action, Comedy, Drama, Thriller, Romance, Sci-Fi, Horror, Animation
    target_genres = ["Action", "Comedy", "Drama", "Thriller", "Romance", "Sci-Fi", "Horror", "Animation"]
    taste_vector = []
    for tg in target_genres:
        # Use user affinity, or try lowercase/case-insensitive match if not found directly
        score = genre_affinity.get(tg, 0.0)
        if score == 0.0:
            # Fallback check for case differences
            score = next((val for key, val in genre_affinity.items() if key.lower() == tg.lower()), 0.0)
        taste_vector.append(float(score))
        
    return {
        "avg_rating": float(user_doc.get("avg_rating", 0.0)),
        "n_rated": int(n_rated),
        "top_genres": top_genres,
        "taste_vector": taste_vector
    }
