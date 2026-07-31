from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from bson import ObjectId
from utils.db import users_col, movies_col
from utils.auth_utils import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
watchlist_router = APIRouter(prefix="/watchlist", tags=["watchlist"])
security = HTTPBearer()

# Pydantic schemas for request bodies
class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: str
    onboarding_complete: bool
    age: Optional[str] = None
    age_group: Optional[str] = None
    preferred_genres: List[str] = []
    content_type: Optional[str] = None
    duration: Optional[str] = None
    content_length: Optional[str] = None
    mood: List[str] = []
    preferred_languages: List[str] = []
    watchlist: List[dict] = []
    liked_movies: List[dict] = []
    matched_movielens_user_id: Optional[int] = None

class PreferenceQuestionnaireRequest(BaseModel):
    age: Optional[str] = None
    age_group: Optional[str] = None
    preferred_genres: List[str] = []
    content_type: Optional[str] = None
    duration: Optional[str] = None
    content_length: Optional[str] = None
    mood: List[str] = []
    preferred_languages: List[str] = []

# Helper to serialize MongoDB user document into response dictionary
def serialize_user(user_doc) -> dict:
    age_val = str(user_doc.get("age_group") or user_doc.get("age") or "") or None
    duration_val = str(user_doc.get("duration") or user_doc.get("content_length") or "") or None
    return {
        "id": str(user_doc["_id"]),
        "username": user_doc.get("username"),
        "email": user_doc.get("email"),
        "created_at": user_doc.get("created_at").isoformat() if isinstance(user_doc.get("created_at"), datetime) else str(user_doc.get("created_at")),
        "onboarding_complete": user_doc.get("onboarding_complete", False),
        "age": age_val,
        "age_group": age_val,
        "preferred_genres": user_doc.get("preferred_genres", []),
        "content_type": user_doc.get("content_type"),
        "duration": duration_val,
        "content_length": duration_val,
        "mood": user_doc.get("mood", []),
        "preferred_languages": user_doc.get("preferred_languages", []),
        "watchlist": user_doc.get("watchlist", []),
        "liked_movies": user_doc.get("liked_movies", []),
        "matched_movielens_user_id": user_doc.get("matched_movielens_user_id")
    }

# Dependency to retrieve the current logged in user from JWT token
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        user = users_col.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.post("/signup", response_model=TokenResponse)
def signup(body: SignupRequest):
    email = body.email.strip().lower()
    username = body.username.strip()
    password = body.password
    
    if not email or not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All fields (username, email, password) are required"
        )
        
    # Check if user already exists
    existing_user = users_col.find_one({"email": email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
        
    # Create the user document with the schema specified
    hashed_pwd = hash_password(password)
    new_user = {
        "username": username,
        "email": email,
        "password_hash": hashed_pwd,
        "created_at": datetime.utcnow(),
        "onboarding_complete": False,
        "age": None,
        "preferred_genres": [],
        "content_length": None,
        "watchlist": [],
        "liked_movies": [],
        "matched_movielens_user_id": None
    }
    
    try:
        result = users_col.insert_one(new_user)
        user_id_str = str(result.inserted_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user in database: {str(e)}"
        )
        
    # Generate JWT token
    token = create_access_token(data={"sub": user_id_str, "email": email})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    email = body.email.strip().lower()
    password = body.password
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )
        
    # Find user by email
    user = users_col.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password"
        )
        
    # Verify password hash
    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password"
        )
        
    # Generate JWT token
    user_id_str = str(user["_id"])
    token = create_access_token(data={"sub": user_id_str, "email": email})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user = Depends(get_current_user)):
    """
    Returns the current user profile from JWT token.
    """
    return serialize_user(current_user)

@router.post("/preferences", response_model=UserProfileResponse)
def save_preferences(
    body: PreferenceQuestionnaireRequest,
    current_user = Depends(get_current_user)
):
    """
    Save cold start questionnaire responses for first time user.
    """
    age_val = body.age or body.age_group
    duration_val = body.duration or body.content_length
    users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "onboarding_complete": True,
            "age": age_val,
            "age_group": age_val,
            "preferred_genres": body.preferred_genres,
            "content_type": body.content_type,
            "duration": duration_val,
            "content_length": duration_val,
            "mood": body.mood,
            "preferred_languages": body.preferred_languages,
            "updated_at": datetime.utcnow()
        }}
    )
    updated_user = users_col.find_one({"_id": current_user["_id"]})
    return serialize_user(updated_user)

@router.post("/preferences/skip", response_model=UserProfileResponse)
def skip_preferences(
    current_user = Depends(get_current_user)
):
    """
    Skip cold start questionnaire for first time user.
    """
    users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "onboarding_complete": True,
            "updated_at": datetime.utcnow()
        }}
    )
    updated_user = users_col.find_one({"_id": current_user["_id"]})
    return serialize_user(updated_user)


# Watchlist Schemas and Routes
class WatchlistAddRequest(BaseModel):
    movie_id: int
    title: str
    poster_url: str

class WatchlistRemoveRequest(BaseModel):
    movie_id: int

@watchlist_router.post("/add")
def add_to_watchlist(
    body: WatchlistAddRequest,
    current_user = Depends(get_current_user)
):
    watchlist = current_user.get("watchlist", [])
    already_exists = any(
        (item.get("movie_id") if isinstance(item, dict) else item) == body.movie_id
        for item in watchlist
    )
    if not already_exists:
        new_item = {
            "movie_id": body.movie_id,
            "title": body.title,
            "poster_url": body.poster_url,
            "added_at": datetime.utcnow()
        }
        users_col.update_one(
            {"_id": current_user["_id"]},
            {"$push": {"watchlist": new_item}}
        )
        updated_user = users_col.find_one({"_id": current_user["_id"]})
        watchlist = updated_user.get("watchlist", [])

    return {
        "message": "Added to watchlist",
        "watchlist_count": len(watchlist)
    }

@watchlist_router.post("/remove")
def remove_from_watchlist(
    body: WatchlistRemoveRequest,
    current_user = Depends(get_current_user)
):
    users_col.update_one(
        {"_id": current_user["_id"]},
        {"$pull": {"watchlist": {"movie_id": body.movie_id}}}
    )
    users_col.update_one(
        {"_id": current_user["_id"]},
        {"$pull": {"watchlist": body.movie_id}}
    )
    return {"message": "Removed from watchlist"}

@watchlist_router.get("")
def get_watchlist(
    current_user = Depends(get_current_user)
):
    user_doc = users_col.find_one({"_id": current_user["_id"]})
    raw_watchlist = user_doc.get("watchlist", []) if user_doc else []
    
    formatted_watchlist = []
    for item in raw_watchlist:
        if isinstance(item, dict):
            formatted_watchlist.append({
                "movie_id": item.get("movie_id"),
                "title": item.get("title", ""),
                "poster_url": item.get("poster_url", "")
            })
        elif isinstance(item, int):
            movie_doc = movies_col.find_one({"movie_id": item})
            formatted_watchlist.append({
                "movie_id": item,
                "title": movie_doc.get("title", f"Movie {item}") if movie_doc else f"Movie {item}",
                "poster_url": movie_doc.get("poster_url", "") if movie_doc else ""
            })
            
    return formatted_watchlist



