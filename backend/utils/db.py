import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/matrixflow")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.get_database() # Defaults to db specified in MONGO_URI, or 'test' if none

# Collections
users_col = db["users"]
movies_col = db["movies"]
ratings_col = db["ratings"]
recommendations_col = db["recommendations"]

def init_db():
    """
    Initialize indexes on database collections.
    """
    try:
        # Create unique index on movie_id in movies collection
        movies_col.create_index("movie_id", unique=True)
        # Create index on user_id in recommendations collection
        recommendations_col.create_index("user_id")
        # Create sparse unique index on email in users collection
        users_col.create_index("email", unique=True, sparse=True)
        print("Database indexes initialized successfully.")
    except Exception as e:
        print(f"Error initializing database indexes: {e}")

# Run database index initialization
init_db()
