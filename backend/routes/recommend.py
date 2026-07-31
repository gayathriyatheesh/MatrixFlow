import os
import requests
import numpy as np
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId

from utils.db import movies_col, recommendations_col, ratings_col, users_col
from services import model_service
from services.model_service import user_map
from utils.auth_utils import decode_access_token

router = APIRouter(prefix="/recommend", tags=["recommendations"])
security_optional = HTTPBearer(auto_error=False)

# TMDB configuration
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
POSTER_FALLBACK = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop"

class MovieRecommendation(BaseModel):
    movie_id: int
    title: str
    poster_url: str
    cf_score: float
    ctr_prob: float
    hybrid_score: float

class RecommendationResponse(BaseModel):
    user_id: int
    mode: str
    results: List[MovieRecommendation]

class ExplanationResponse(BaseModel):
    genre_match: float
    cf_rank: int
    ctr_rank: int
    hybrid_rank: int
    reason_text: str

def get_movie_poster(tmdb_id: Optional[int], movie_id: int) -> str:
    """
    Fetch movie poster from TMDB API or return fallback.
    """
    if not tmdb_id or not TMDB_API_KEY or TMDB_API_KEY == "your_tmdb_api_key_here":
        return POSTER_FALLBACK
        
    try:
        url = f"http://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}"
        res = requests.get(url, timeout=3.0)
        if res.status_code == 200:
            data = res.json()
            poster_path = data.get("poster_path")
            if poster_path:
                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
                # Save to database cache
                movies_col.update_one({"movie_id": movie_id}, {"$set": {"poster_url": poster_url}})
                return poster_url
    except Exception as e:
        print(f"Error fetching TMDB poster for movie {movie_id}: {e}")
        
    return POSTER_FALLBACK

@router.get("/{user_id}", response_model=RecommendationResponse)
def get_recommendations(
    user_id: int,
    mode: str = Query("hybrid", regex="^(hybrid|cf_only|ctr_only)$"),
    alpha: float = Query(0.6, ge=0.0, le=1.0),
    beta: float = Query(0.4, ge=0.0, le=1.0),
    n: int = Query(10, ge=1, le=100),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)
):
    # Fetch user preferences if authenticated user
    user_prefs = None
    if credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and "sub" in payload:
            try:
                user_doc = users_col.find_one({"_id": ObjectId(payload["sub"])})
                if user_doc:
                    user_prefs = {
                        "preferred_genres": user_doc.get("preferred_genres", []),
                        "mood": user_doc.get("mood", []),
                        "content_type": user_doc.get("content_type"),
                        "duration": user_doc.get("duration"),
                        "preferred_languages": user_doc.get("preferred_languages", [])
                    }
            except Exception as e:
                print(f"Error fetching user preferences for recommendations: {e}")

    # Determine alpha/beta weights based on mode
    if mode == "cf_only":
        a, b = 1.0, 0.0
    elif mode == "ctr_only":
        a, b = 0.0, 1.0
    else: # hybrid
        a, b = alpha, beta

    # 2. Check cache in recommendations collection (less than 1 hour old) - only if no specific user preferences
    if not user_prefs:
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        cached_doc = recommendations_col.find_one({
            "user_id": user_id,
            "mode": mode,
            "alpha": a,
            "beta": b,
            "n": n,
            "generated_at": {"$gt": one_hour_ago}
        }, sort=[("generated_at", -1)])
        
        if cached_doc:
            print(f"Returning cached recommendations for user {user_id} (mode={mode})")
            results = cached_doc["results"]
            final_results = []
            for r in results:
                movie = movies_col.find_one({"movie_id": r["movie_id"]})
                title = movie.get("title", f"Movie {r['movie_id']}") if movie else f"Movie {r['movie_id']}"
                poster_url = movie.get("poster_url", "") if movie else ""
                if not poster_url:
                    tmdb_id = movie.get("tmdb_id") if movie else None
                    poster_url = get_movie_poster(tmdb_id, r["movie_id"])
                
                final_results.append({
                    "movie_id": r["movie_id"],
                    "title": title,
                    "poster_url": poster_url,
                    "cf_score": r["cf_score"],
                    "ctr_prob": r["ctr_prob"],
                    "hybrid_score": r["hybrid_score"]
                })
            return {"user_id": user_id, "mode": mode, "results": final_results}

    # 3. Generate new recommendations with preference weighting
    rec_results = model_service.get_hybrid_recommendations(
        user_id=user_id,
        ratings_collection=ratings_col,
        alpha=a,
        beta=b,
        top_n=n,
        user_preferences=user_prefs
    )

    # 4. Fetch title + poster url and update DB if missing
    final_results = []
    cache_results = []
    
    for r in rec_results:
        mid = r["movie_id"]
        movie = movies_col.find_one({"movie_id": mid})
        title = movie.get("title", f"Movie {mid}") if movie else f"Movie {mid}"
        poster_url = movie.get("poster_url", "") if movie else ""
        
        # Hydrate poster_url from TMDB if missing
        if not poster_url:
            tmdb_id = movie.get("tmdb_id") if movie else None
            poster_url = get_movie_poster(tmdb_id, mid)
            
        final_results.append({
            "movie_id": mid,
            "title": title,
            "poster_url": poster_url,
            "cf_score": r["cf_score"],
            "ctr_prob": r["ctr_prob"],
            "hybrid_score": r["hybrid_score"]
        })
        
        cache_results.append({
            "movie_id": mid,
            "cf_score": r["cf_score"],
            "ctr_prob": r["ctr_prob"],
            "hybrid_score": r["hybrid_score"]
        })

    # 5. Cache result in MongoDB
    try:
        recommendations_col.insert_one({
            "user_id": user_id,
            "mode": mode,
            "alpha": a,
            "beta": b,
            "n": n,
            "generated_at": datetime.utcnow(),
            "results": cache_results
        })
    except Exception as e:
        print(f"Error caching recommendations: {e}")

    return {"user_id": user_id, "mode": mode, "results": final_results}



@router.get("/{user_id}/explanation/{movie_id}", response_model=ExplanationResponse)
def get_recommendation_explanation(user_id: int, movie_id: int):
    uid = int(user_id)
    mid = int(movie_id)

    # 1. Fetch user document for genre affinity
    user_doc = users_col.find_one({"user_id": uid})
    if not user_doc:
        raise HTTPException(status_code=404, detail=f"User ID {uid} not found in database.")

    # 2. Fetch movie document for genres
    movie_doc = movies_col.find_one({"movie_id": mid})
    if not movie_doc:
        raise HTTPException(status_code=404, detail=f"Movie ID {mid} not found in database.")

    movie_title = movie_doc.get("title", f"Movie {mid}")
    movie_genres = movie_doc.get("genres", [])

    # Calculate genre match (sum of user's affinity for the movie's genres)
    user_affinities = user_doc.get("genre_affinity", {})
    genre_match = sum(user_affinities.get(g, 0.0) for g in movie_genres)

    # 3. Calculate rankings among 100 candidate movies
    # If user is not in user_map, they are a cold start user
    if uid not in model_service.user_map:
        # Cold start fallback doesn't have rankings, default everything to 0/empty
        reason = f"'{movie_title}' is recommended as it is one of the most popular movies in our database. Since you are a new user, we are serving popular content to match general preferences."
        return {
            "genre_match": genre_match,
            "cf_rank": 0,
            "ctr_rank": 0,
            "hybrid_rank": 0,
            "reason_text": reason
        }

    # Fetch top 100 candidates
    cf_candidates = model_service.get_cf_candidates(uid, n=100)
    candidate_mids = [c["movie_id"] for c in cf_candidates]

    # Calculate CTR scores
    ctr_scores = model_service.get_ctr_scores(uid, candidate_mids, ratings_col)
    ctr_map = {item["movie_id"]: item["ctr_prob"] for item in ctr_scores}

    # Normalize CF scores
    cf_scores_list = [c["cf_score"] for c in cf_candidates]
    min_cf = min(cf_scores_list) if cf_scores_list else 0.0
    max_cf = max(cf_scores_list) if cf_scores_list else 0.0
    cf_range = max_cf - min_cf

    # Compute full list with all metrics
    full_candidates = []
    for c in cf_candidates:
        c_mid = c["movie_id"]
        cf_val = c["cf_score"]
        ctr_val = ctr_map.get(c_mid, 0.0)
        cf_norm = (cf_val - min_cf) / cf_range if cf_range > 0 else 1.0
        # Assume default alpha=0.6, beta=0.4 for explanation ranking
        hybrid_val = 0.6 * cf_norm + 0.4 * ctr_val
        
        full_candidates.append({
            "movie_id": c_mid,
            "cf_score": cf_val,
            "ctr_prob": ctr_val,
            "hybrid_score": hybrid_val
        })

    # Sort in different ways to find ranks
    # CF rank
    sorted_cf = sorted(full_candidates, key=lambda x: x["cf_score"], reverse=True)
    cf_rank = next((idx + 1 for idx, item in enumerate(sorted_cf) if item["movie_id"] == mid), -1)

    # CTR rank
    sorted_ctr = sorted(full_candidates, key=lambda x: x["ctr_prob"], reverse=True)
    ctr_rank = next((idx + 1 for idx, item in enumerate(sorted_ctr) if item["movie_id"] == mid), -1)

    # Hybrid rank
    sorted_hybrid = sorted(full_candidates, key=lambda x: x["hybrid_score"], reverse=True)
    hybrid_rank = next((idx + 1 for idx, item in enumerate(sorted_hybrid) if item["movie_id"] == mid), -1)

    # Fetch details for the specific movie if found in candidates
    target_item = next((item for item in full_candidates if item["movie_id"] == mid), None)
    ctr_prob = target_item["ctr_prob"] if target_item else 0.0

    # Build reason text
    genres_text = ", ".join(movie_genres[:3])
    if hybrid_rank != -1:
        reason = (
            f"'{movie_title}' is recommended because it matches your interest in {genres_text} (genre match score of {genre_match:.2f}). "
            f"It ranks #{cf_rank} in collaborative filtering and has a {ctr_prob:.1%} predicted click probability, "
            f"placing it #{hybrid_rank} overall."
        )
    else:
        reason = (
            f"'{movie_title}' is recommended based on your interest in {genres_text} (genre match score of {genre_match:.2f})."
        )

    return {
        "genre_match": float(genre_match),
        "cf_rank": int(cf_rank),
        "ctr_rank": int(ctr_rank),
        "hybrid_rank": int(hybrid_rank),
        "reason_text": reason
    }


# ──────────────────────────────────────────────────
# GET /movie-details/{movie_id} — Rich TMDB Movie Details
# ──────────────────────────────────────────────────

TMDB_DETAIL_API_KEY = "47c14a401a1dd21a16fbc91a239518df"

def resolve_tmdb_id(movie_id: int) -> Optional[int]:
    """
    Look up tmdb_id for a MovieLens movie_id.
    1. Check MongoDB cache first.
    2. If missing, search TMDB by title and store back.
    """
    movie_doc = movies_col.find_one({"movie_id": movie_id})
    if not movie_doc:
        return None

    tmdb_id = movie_doc.get("tmdb_id")
    if tmdb_id:
        return int(tmdb_id)

    # Search TMDB by title
    raw_title = movie_doc.get("title", "")
    # Strip trailing year from MovieLens titles like "Matrix, The (1999)"
    import re
    clean_title = re.sub(r'\s*\(\d{4}\)\s*$', '', raw_title).strip()

    try:
        search_url = f"http://api.themoviedb.org/3/search/movie?api_key={TMDB_DETAIL_API_KEY}&query={clean_title}"
        res = requests.get(search_url, timeout=5.0)
        if res.status_code == 200:
            results = res.json().get("results", [])
            if results:
                tmdb_id = results[0].get("id")
                if tmdb_id:
                    # Cache it back to MongoDB
                    movies_col.update_one(
                        {"movie_id": movie_id},
                        {"$set": {"tmdb_id": int(tmdb_id)}}
                    )
                    return int(tmdb_id)
    except Exception as e:
        print(f"TMDB search failed for '{clean_title}': {e}")

    return None

@router.get("/movie-details/{movie_id}")
def get_movie_details(movie_id: int):
    """
    Fetch rich movie details from TMDB including credits and watch providers.
    Resolves tmdb_id from MongoDB or by searching TMDB by title.
    """
    # 1. Get the movie from our DB
    movie_doc = movies_col.find_one({"movie_id": movie_id})
    if not movie_doc:
        raise HTTPException(status_code=404, detail=f"Movie {movie_id} not found.")

    our_title = movie_doc.get("title", f"Movie {movie_id}")
    our_genres = movie_doc.get("genres", [])
    our_poster = movie_doc.get("poster_url", POSTER_FALLBACK)

    # 2. Resolve TMDB ID
    tmdb_id = resolve_tmdb_id(movie_id)
    if not tmdb_id:
        # Return basic info if TMDB lookup fails entirely
        return {
            "movie_id": movie_id,
            "tmdb_id": None,
            "title": our_title,
            "poster_url": our_poster,
            "genres": our_genres,
            "release_date": None,
            "runtime": None,
            "overview": None,
            "cast": [],
            "watch_providers_in": None,
            "justwatch_url": f"https://www.justwatch.com/in/search?q={our_title}"
        }

    # 3. Fetch TMDB movie details with credits and watch/providers
    try:
        detail_url = (
            f"http://api.themoviedb.org/3/movie/{tmdb_id}"
            f"?api_key={TMDB_DETAIL_API_KEY}"
            f"&append_to_response=credits,watch/providers"
        )
        res = requests.get(detail_url, timeout=5.0)
        if res.status_code != 200:
            raise Exception(f"TMDB returned {res.status_code}")
        data = res.json()
    except Exception as e:
        print(f"TMDB detail fetch failed for tmdb_id {tmdb_id}: {e}")
        return {
            "movie_id": movie_id,
            "tmdb_id": tmdb_id,
            "title": our_title,
            "poster_url": our_poster,
            "genres": our_genres,
            "release_date": None,
            "runtime": None,
            "overview": None,
            "cast": [],
            "watch_providers_in": None,
            "justwatch_url": f"https://www.justwatch.com/in/search?q={our_title}"
        }

    # 4. Extract poster
    poster_path = data.get("poster_path")
    poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else our_poster

    # 5. Extract genres from TMDB (richer than our DB)
    tmdb_genres = [g["name"] for g in data.get("genres", [])]
    genres = tmdb_genres if tmdb_genres else our_genres

    # 6. Extract top 5 cast members
    credits = data.get("credits", {})
    cast_list = credits.get("cast", [])[:5]
    cast = [
        {
            "name": c.get("name", ""),
            "character": c.get("character", ""),
            "profile_path": (
                f"https://image.tmdb.org/t/p/w185{c['profile_path']}"
                if c.get("profile_path") else None
            )
        }
        for c in cast_list
    ]

    # 7. Extract watch providers for India (IN)
    watch_providers_raw = data.get("watch/providers", {}).get("results", {})
    india_providers = watch_providers_raw.get("IN")
    watch_providers_in = None
    if india_providers:
        providers_list = []
        # Combine flatrate (subscription), rent, and buy
        for provider_type in ["flatrate", "rent", "buy"]:
            for p in india_providers.get(provider_type, []):
                logo_path = p.get("logo_path")
                providers_list.append({
                    "provider_name": p.get("provider_name", ""),
                    "logo_url": f"https://image.tmdb.org/t/p/w92{logo_path}" if logo_path else None,
                    "type": provider_type
                })
        # Deduplicate by provider_name
        seen = set()
        deduped = []
        for p in providers_list:
            if p["provider_name"] not in seen:
                seen.add(p["provider_name"])
                deduped.append(p)
        watch_providers_in = deduped if deduped else None

    # Build clean title for JustWatch URL
    import re
    clean_title = re.sub(r'\s*\(\d{4}\)\s*$', '', our_title).strip()

    return {
        "movie_id": movie_id,
        "tmdb_id": tmdb_id,
        "title": data.get("title", our_title),
        "original_title": our_title,
        "poster_url": poster_url,
        "genres": genres,
        "release_date": data.get("release_date"),
        "runtime": data.get("runtime"),
        "overview": data.get("overview"),
        "vote_average": data.get("vote_average"),
        "cast": cast,
        "watch_providers_in": watch_providers_in,
        "justwatch_url": f"https://www.justwatch.com/in/search?q={clean_title}"
    }


# ──────────────────────────────────────────────────
# POST /match-user — Cosine Similarity User Matching
# ──────────────────────────────────────────────────

class MatchUserRequest(BaseModel):
    movie_ids: List[int]

class MatchUserResponse(BaseModel):
    matched_user_id: int
    similarity_score: float
    message: str

@router.post("/match-user", response_model=MatchUserResponse)
def match_user(body: MatchUserRequest, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)):
    """
    Given a list of selected MovieLens movie_ids, build a taste vector by
    averaging Vt columns, then find the most similar user in U via cosine
    similarity (fully vectorized with numpy).
    """
    if not body.movie_ids:
        raise HTTPException(status_code=400, detail="movie_ids list cannot be empty.")

    # Access model matrices from model_service
    U_mat = model_service.U
    Vt_mat = model_service.Vt
    m_map = model_service.movie_map
    u_map = model_service.user_map

    if U_mat is None or Vt_mat is None or m_map is None or u_map is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet.")

    target_movie_ids = list(body.movie_ids)
    if credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and "sub" in payload:
            try:
                user_doc = users_col.find_one({"_id": ObjectId(payload["sub"])})
                if user_doc:
                    user_watchlist = user_doc.get("watchlist", [])
                    watchlist_mids = [
                        item.get("movie_id") if isinstance(item, dict) else item
                        for item in user_watchlist
                        if (item.get("movie_id") if isinstance(item, dict) else item) is not None
                    ]
                    if len(watchlist_mids) >= 5:
                        target_movie_ids = watchlist_mids
            except Exception as e:
                print(f"Error checking watchlist for user matching: {e}")

    if not target_movie_ids:
        raise HTTPException(status_code=400, detail="movie_ids list cannot be empty.")

    # 1. Resolve movie_ids → column indices in Vt
    col_indices = []
    for mid in target_movie_ids:
        if mid in m_map:
            col_indices.append(m_map[mid])

    if not col_indices:
        raise HTTPException(
            status_code=404,
            detail="None of the provided movie_ids exist in the SVD model."
        )

    # 2. Build taste vector: average the selected Vt columns → shape (k,)
    #    Vt has shape (k, n_movies), so Vt[:, col_indices] → (k, len(col_indices))
    taste_vector = np.mean(Vt_mat[:, col_indices], axis=1)  # shape (k,)

    # 3. Cosine similarity against every row of U → vectorised
    #    U has shape (n_users, k)
    #    dot products:  U @ taste_vector → shape (n_users,)
    dots = U_mat @ taste_vector                              # (n_users,)
    user_norms = np.linalg.norm(U_mat, axis=1)               # (n_users,)
    taste_norm = np.linalg.norm(taste_vector)                 # scalar

    # Guard against zero norms
    if taste_norm == 0.0:
        raise HTTPException(status_code=400, detail="Taste vector is zero; pick different movies.")

    similarities = dots / (user_norms * taste_norm + 1e-10)   # (n_users,)

    # 4. Find the best match (argmax)
    best_idx = int(np.argmax(similarities))
    best_score = float(similarities[best_idx])

    # 5. Reverse-lookup: row index → original user_id
    #    user_map is {user_id: row_idx}, so invert it
    reverse_user_map = {v: k for k, v in u_map.items()}
    matched_user_id = reverse_user_map.get(best_idx, -1)

    # 6. If the request was made by an authenticated user, persist the matched MovieLens ID to their profile
    if credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and "sub" in payload:
            try:
                users_col.update_one(
                    {"_id": ObjectId(payload["sub"])},
                    {"$set": {
                        "matched_movielens_user_id": matched_user_id,
                        "onboarding_complete": True
                    }}
                )
                print(f"Associated MovieLens user_id {matched_user_id} with authenticated user {payload['sub']}")
            except Exception as e:
                print(f"Error persisting matched MovieLens user_id: {e}")

    return {
        "matched_user_id": matched_user_id,
        "similarity_score": round(best_score, 6),
        "message": "Found your taste profile"
    }


# ──────────────────────────────────────────────────
# GET /search?q= — Movie Title Search
# ──────────────────────────────────────────────────

search_router = APIRouter(prefix="/search", tags=["search"])

class SearchResultItem(BaseModel):
    movie_id: int
    title: str
    poster_url: str
    genres: List[str] = []

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]

@search_router.get("", response_model=SearchResponse)
def search_movies(
    q: str = Query(..., min_length=1, description="Search query string"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)
):
    """
    Search the movies collection for titles containing the query string (case insensitive).
    Returns top 10 matching movies with movie_id, title, poster_url, and genres.
    """
    import re
    # Escape special regex characters in query to prevent injection
    escaped_q = re.escape(q.strip())
    if not escaped_q:
        return {"query": q, "results": []}

    # Case-insensitive regex search on the title field
    cursor = movies_col.find(
        {"title": {"$regex": escaped_q, "$options": "i"}},
        {"_id": 0, "movie_id": 1, "title": 1, "poster_url": 1, "genres": 1, "tmdb_id": 1}
    ).limit(10)

    results = []
    for doc in cursor:
        mid = doc.get("movie_id")
        title = doc.get("title", f"Movie {mid}")
        poster_url = doc.get("poster_url", "")
        genres = doc.get("genres", [])

        # Hydrate poster if missing
        if not poster_url:
            tmdb_id = doc.get("tmdb_id")
            poster_url = get_movie_poster(tmdb_id, mid)

        results.append({
            "movie_id": mid,
            "title": title,
            "poster_url": poster_url,
            "genres": genres
        })

    return {"query": q, "results": results}
