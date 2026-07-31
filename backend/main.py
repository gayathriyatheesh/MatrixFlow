import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database client and index initializer
from utils.db import client, init_db
from routes.recommend import router as recommend_router, search_router
from routes.metrics import router as metrics_router
from routes.auth import router as auth_router, watchlist_router

app = FastAPI(
    title="MatrixFlow Backend",
    description="Factorization-Driven Recommendation Engine with Real-Time CTR Optimisation",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174", 
    "https://matrixflow-three.vercel.app"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup events
@app.on_event("startup")
async def startup_event():
    # Make sure database indexes are created
    init_db()
    print("FastAPI application started and database initialized.")

# Mount routers
app.include_router(recommend_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(watchlist_router, prefix="/api")

# Health endpoint
@app.get("/api/health")
def health_check():
    """
    Check system health by pinging MongoDB.
    """
    try:
        # The ping command is cheap and checks if the client can talk to the server
        client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "message": "MatrixFlow backend is running smoothly."
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Database connection unhealthy: {str(e)}"
        )

# Main route
@app.get("/")
def read_root():
    return {
        "app": "MatrixFlow API",
        "description": "Collaborative Filtering (SVD) + Click-Through Rate (Logistic Regression) Hybrid recommender.",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
